import { pool } from "../../config/dbconfig";
import { ApiError } from "../../utils/ApiError";
import { withTransaction } from "../../utils/withTransaction";

type TournamentOwnerRow = {
  tournament_id: string;
};

type TeamStandingRow = {
  team_id: string;
  team_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  no_results: number;
  points: number;
  net_run_rate: number;
};

const calculatePoints = (wins: number, ties: number, noResults: number) => {
  return wins * 2 + ties + noResults;
};

const toNumber = (value: any) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const pointService = {
  refreshPointsTable: async (tournamentId: string, userId: string) => {
    const tournamentCheck = await pool.query<TournamentOwnerRow>(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2
       LIMIT 1`,
      [tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) {
      throw new ApiError(403, "Tournament not found or you are not authorized");
    }

    const standings = await pool.query<TeamStandingRow>(
      `
      WITH team_list AS (
        SELECT team_id
        FROM teams
        WHERE tournament_id = $1
      ),
      match_results AS (
        SELECT
          m.team1_id,
          m.team2_id,
          m.winner_team_id,
          m.status
        FROM matches m
        WHERE m.tournament_id = $1
      ),
      innings_stats AS (
        SELECT
          i.batting_team_id AS team_id,
          COALESCE(SUM(i.runs), 0)::int AS runs_scored,
          COALESCE(SUM(i.balls_bowled), 0)::int AS balls_faced
        FROM innings i
        JOIN matches m ON m.match_id = i.match_id
        WHERE m.tournament_id = $1
        GROUP BY i.batting_team_id
      ),
      conceded_stats AS (
        SELECT
          i.bowling_team_id AS team_id,
          COALESCE(SUM(i.runs), 0)::int AS runs_conceded,
          COALESCE(SUM(i.balls_bowled), 0)::int AS balls_bowled
        FROM innings i
        JOIN matches m ON m.match_id = i.match_id
        WHERE m.tournament_id = $1
        GROUP BY i.bowling_team_id
      ),
      result_stats AS (
        SELECT
          tl.team_id,
          COALESCE(COUNT(*) FILTER (
            WHERE mr.status = 'completed'
              AND (mr.team1_id = tl.team_id OR mr.team2_id = tl.team_id)
          ), 0)::int AS matches_played,

          COALESCE(COUNT(*) FILTER (
            WHERE mr.status = 'completed'
              AND mr.winner_team_id = tl.team_id
          ), 0)::int AS wins,

          COALESCE(COUNT(*) FILTER (
            WHERE mr.status = 'completed'
              AND mr.winner_team_id IS NOT NULL
              AND mr.winner_team_id <> tl.team_id
              AND (mr.team1_id = tl.team_id OR mr.team2_id = tl.team_id)
          ), 0)::int AS losses,

          COALESCE(COUNT(*) FILTER (
            WHERE mr.status = 'completed'
              AND mr.winner_team_id IS NULL
              AND (mr.team1_id = tl.team_id OR mr.team2_id = tl.team_id)
          ), 0)::int AS ties,

          COALESCE(COUNT(*) FILTER (
            WHERE mr.status IN ('abandoned', 'cancelled')
              AND (mr.team1_id = tl.team_id OR mr.team2_id = tl.team_id)
          ), 0)::int AS no_results
        FROM team_list tl
        LEFT JOIN match_results mr
          ON mr.team1_id = tl.team_id
          OR mr.team2_id = tl.team_id
        GROUP BY tl.team_id
      )
      SELECT
        tl.team_id,
        tm.team_name,
        rs.matches_played,
        rs.wins,
        rs.losses,
        rs.ties,
        rs.no_results,
        (
          rs.wins * 2 + rs.ties + rs.no_results
        )::int AS points,
        COALESCE(
          (
            (COALESCE(ins.runs_scored, 0)::numeric / NULLIF(COALESCE(ins.balls_faced, 0), 0) * 6)
            -
            (COALESCE(con.runs_conceded, 0)::numeric / NULLIF(COALESCE(con.balls_bowled, 0), 0) * 6)
          )::numeric,
          0
        ) AS net_run_rate
      FROM team_list tl
      JOIN teams tm ON tm.team_id = tl.team_id
      LEFT JOIN result_stats rs ON rs.team_id = tl.team_id
      LEFT JOIN innings_stats ins ON ins.team_id = tl.team_id
      LEFT JOIN conceded_stats con ON con.team_id = tl.team_id
      ORDER BY points DESC, net_run_rate DESC, tm.team_name ASC
      `,
      [tournamentId]
    );

    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM points_table
         WHERE tournament_id = $1`,
        [tournamentId]
      );

      for (const row of standings.rows) {
        await client.query(
          `INSERT INTO points_table
           (tournament_id, team_id, matches_played, wins, losses, ties, no_results, points, net_run_rate, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            tournamentId,
            row.team_id,
            toNumber(row.matches_played),
            toNumber(row.wins),
            toNumber(row.losses),
            toNumber(row.ties),
            toNumber(row.no_results),
            toNumber(row.points),
            row.net_run_rate,
          ]
        );
      }
    });

    return { message: "Points table refreshed successfully" };
  },

  getPointsTable: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT pt.points_table_id,
              pt.tournament_id,
              pt.team_id,
              tm.team_name,
              pt.matches_played,
              pt.wins,
              pt.losses,
              pt.ties,
              pt.no_results,
              pt.points,
              pt.net_run_rate,
              pt.updated_at
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       WHERE pt.tournament_id = $1
       ORDER BY pt.points DESC, pt.net_run_rate DESC, tm.team_name ASC`,
      [tournamentId]
    );

    return result.rows;
  },

  getTeamStanding: async (tournamentId: string, teamId: string) => {
    const result = await pool.query(
      `SELECT pt.points_table_id,
              pt.tournament_id,
              pt.team_id,
              tm.team_name,
              pt.matches_played,
              pt.wins,
              pt.losses,
              pt.ties,
              pt.no_results,
              pt.points,
              pt.net_run_rate,
              pt.updated_at
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       WHERE pt.tournament_id = $1
         AND pt.team_id = $2
       LIMIT 1`,
      [tournamentId, teamId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Standing not found for this team");
    }

    return result.rows[0];
  },

  resetPointsTable: async (tournamentId: string, userId: string) => {
    const tournamentCheck = await pool.query<TournamentOwnerRow>(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2
       LIMIT 1`,
      [tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) {
      throw new ApiError(403, "Tournament not found or you are not authorized");
    }

    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM points_table
         WHERE tournament_id = $1`,
        [tournamentId]
      );
    });

    return { message: "Points table reset successfully" };
  },
};