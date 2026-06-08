import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";

type CountRow = { count: number };

export const dashboardService = {
  getSummary: async () => {
    try {
      const [
        totalTournamentsResult,
        totalTeamsResult,
        liveMatchesResult,
        upcomingMatchesResult,
        completedMatchesResult,
      ] = await Promise.all([
        pool.query<CountRow>(`SELECT COUNT(*)::int AS count FROM tournaments`),
        pool.query<CountRow>(`SELECT COUNT(*)::int AS count FROM teams`),
        pool.query<CountRow>(`SELECT COUNT(*)::int AS count FROM matches WHERE status = 'live'`),
        pool.query<CountRow>(`SELECT COUNT(*)::int AS count FROM matches WHERE status = 'upcoming'`),
        pool.query<CountRow>(`SELECT COUNT(*)::int AS count FROM matches WHERE status = 'completed'`),
      ]);

      return {
        totalTournaments: totalTournamentsResult.rows[0].count,
        totalTeams: totalTeamsResult.rows[0].count,
        liveMatches: liveMatchesResult.rows[0].count,
        upcomingMatches: upcomingMatchesResult.rows[0].count,
        completedMatches: completedMatchesResult.rows[0].count,
      };
    } catch (error) {
      throw new ApiError(500, "Failed to fetch dashboard summary");
    }
  },

  getLiveMatches: async () => {
    try {
      const result = await pool.query(
        `SELECT
           m.match_id, m.tournament_id, m.ground_name, m.match_type,
           m.overs, m.status, m.started_at, m.scheduled_start_at,
           t1.team_name  AS team1_name,
           t2.team_name  AS team2_name,
           tw.team_name  AS toss_winner_team_name,
           fb.team_name  AS first_batting_team_name,
           tn.tournament_name,
           -- innings scores
           i1.runs       AS team1_runs,   i1.wickets AS team1_wickets,
           i1.balls_bowled AS team1_balls,
           i2.runs       AS team2_runs,   i2.wickets AS team2_wickets,
           i2.balls_bowled AS team2_balls,
           -- which innings is active
           ci.innings_id AS current_innings_id,
           ci.innings_no AS current_innings_no,
           ci.batting_team_id AS current_batting_team_id
         FROM matches m
         JOIN teams t1 ON m.team1_id = t1.team_id
         JOIN teams t2 ON m.team2_id = t2.team_id
         LEFT JOIN teams tw  ON m.toss_winner_team_id  = tw.team_id
         LEFT JOIN teams fb  ON m.first_batting_team_id = fb.team_id
         LEFT JOIN tournaments tn ON m.tournament_id = tn.tournament_id
         -- innings 1
         LEFT JOIN innings i1
           ON i1.match_id = m.match_id AND i1.innings_no = 1
         -- innings 2
         LEFT JOIN innings i2
           ON i2.match_id = m.match_id AND i2.innings_no = 2
         -- current (not completed) innings
         LEFT JOIN innings ci
           ON ci.match_id = m.match_id AND ci.is_completed = false
         WHERE m.status = 'live'
         ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      throw new ApiError(500, "Failed to fetch live matches");
    }
  },

  getUpcomingMatches: async () => {
    try {
      const result = await pool.query(
        `SELECT
           m.match_id, m.tournament_id, m.ground_name, m.match_type,
           m.overs, m.status, m.scheduled_start_at,
           t1.team_name AS team1_name,
           t2.team_name AS team2_name,
           tn.tournament_name
         FROM matches m
         JOIN teams t1 ON m.team1_id = t1.team_id
         JOIN teams t2 ON m.team2_id = t2.team_id
         LEFT JOIN tournaments tn ON m.tournament_id = tn.tournament_id
         WHERE m.status = 'upcoming'
         ORDER BY m.scheduled_start_at ASC NULLS LAST, m.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      throw new ApiError(500, "Failed to fetch upcoming matches");
    }
  },

  getRecentTournaments: async () => {
    try {
      const result = await pool.query(
        `SELECT
           t.tournament_id, t.tournament_name, t.organization_name,
           t.status, t.start_date, t.end_date,
           u.username AS created_by_username
         FROM tournaments t
         JOIN users u ON t.created_by_user_id = u.user_id
         ORDER BY t.created_at DESC
         LIMIT 10`
      );
      return result.rows;
    } catch (error) {
      throw new ApiError(500, "Failed to fetch recent tournaments");
    }
  },

  // Removed getTopTeams — no longer needed on dashboard

  getTopPlayers: async () => {
    try {
      const result = await pool.query(
        `SELECT
           u.user_id,
           u.username,
           u.profile_image,
           COALESCE(bat.total_runs, 0)::int     AS total_runs,
           COALESCE(bat.innings_count, 0)::int  AS innings_batted,
           COALESCE(bat.highest_score, 0)::int  AS highest_score,
           COALESCE(bowl.total_wickets, 0)::int AS total_wickets,
           COALESCE(bowl.innings_bowled, 0)::int AS innings_bowled
         FROM users u
         LEFT JOIN (
           SELECT
             striker_id AS user_id,
             SUM(runs_scored)::int             AS total_runs,
             COUNT(DISTINCT innings_id)::int   AS innings_count,
             MAX(runs_scored)::int             AS highest_score
           FROM ball_by_ball
           WHERE striker_id IS NOT NULL
           GROUP BY striker_id
         ) bat ON bat.user_id = u.user_id
         LEFT JOIN (
           SELECT
             bowler_id AS user_id,
             SUM(CASE WHEN is_wicket THEN 1 ELSE 0 END)::int AS total_wickets,
             COUNT(DISTINCT innings_id)::int                  AS innings_bowled
           FROM ball_by_ball
           WHERE bowler_id IS NOT NULL
           GROUP BY bowler_id
         ) bowl ON bowl.user_id = u.user_id
         WHERE COALESCE(bat.total_runs, 0) > 0 OR COALESCE(bowl.total_wickets, 0) > 0
         ORDER BY COALESCE(bat.total_runs, 0) DESC
         LIMIT 20`
      );
      return result.rows;
    } catch (error) {
      throw new ApiError(500, "Failed to fetch top players");
    }
  },
};