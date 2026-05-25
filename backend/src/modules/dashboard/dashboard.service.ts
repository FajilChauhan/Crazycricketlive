import { pool } from "../../config/dbconfig";

export const dashboardService = {
  getSummary: async () => {
    const totalTournaments = await pool.query(
      `SELECT COUNT(*)::int AS count FROM tournaments`
    );

    const totalTeams = await pool.query(
      `SELECT COUNT(*)::int AS count FROM teams`
    );

    const liveMatches = await pool.query(
      `SELECT COUNT(*)::int AS count FROM matches WHERE status = 'live'`
    );

    const upcomingMatches = await pool.query(
      `SELECT COUNT(*)::int AS count FROM matches WHERE status = 'upcoming'`
    );

    const completedMatches = await pool.query(
      `SELECT COUNT(*)::int AS count FROM matches WHERE status = 'completed'`
    );

    return {
      totalTournaments: totalTournaments.rows[0].count,
      totalTeams: totalTeams.rows[0].count,
      liveMatches: liveMatches.rows[0].count,
      upcomingMatches: upcomingMatches.rows[0].count,
      completedMatches: completedMatches.rows[0].count,
    };
  },

  getLiveMatches: async () => {
    const result = await pool.query(
      `SELECT m.match_id, m.tournament_id, m.ground_name, m.match_type, m.overs, m.status,
              m.started_at, m.scheduled_start_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name,
              tw.team_name AS toss_winner_team_name,
              fb.team_name AS first_batting_team_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
       LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
       WHERE m.status = 'live'
       ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC`
    );

    return result.rows;
  },

  getUpcomingMatches: async () => {
    const result = await pool.query(
      `SELECT m.match_id, m.tournament_id, m.ground_name, m.match_type, m.overs, m.status,
              m.scheduled_start_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE m.status = 'upcoming'
       ORDER BY m.scheduled_start_at ASC NULLS LAST, m.created_at DESC`
    );

    return result.rows;
  },

  getRecentTournaments: async () => {
    const result = await pool.query(
      `SELECT t.tournament_id, t.tournament_name, t.organization_name, t.status, t.start_date, t.end_date,
              u.username AS created_by_username
       FROM tournaments t
       JOIN users u ON t.created_by_user_id = u.user_id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );

    return result.rows;
  },

  getTopTeams: async () => {
    const result = await pool.query(
      `SELECT pt.tournament_id, pt.team_id, tm.team_name, pt.matches_played, pt.wins, pt.losses,
              pt.ties, pt.no_results, pt.points, pt.net_run_rate
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       ORDER BY pt.points DESC, pt.net_run_rate DESC
       LIMIT 10`
    );

    return result.rows;
  },

  getTopPlayers: async () => {
    const batting = await pool.query(
      `SELECT bb.striker_id AS user_id,
              u.username,
              SUM(bb.runs_scored) AS total_runs
       FROM ball_by_ball bb
       JOIN users u ON bb.striker_id = u.user_id
       GROUP BY bb.striker_id, u.username
       ORDER BY total_runs DESC
       LIMIT 10`
    );

    const bowling = await pool.query(
      `SELECT bb.bowler_id AS user_id,
              u.username,
              SUM(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END) AS total_wickets
       FROM ball_by_ball bb
       JOIN users u ON bb.bowler_id = u.user_id
       GROUP BY bb.bowler_id, u.username
       ORDER BY total_wickets DESC
       LIMIT 10`
    );

    return {
      topBatters: batting.rows,
      topBowlers: bowling.rows,
    };
  },
};