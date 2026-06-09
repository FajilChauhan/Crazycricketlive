import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";
import { CreateTournamentBody, UpdateTournamentBody } from "./tournament.types";

type TournamentRow = {
  tournament_id: string;
  tournament_name: string;
  organization_name: string;
  created_by_user_id: string;
  status: "draft" | "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: Date;
  updated_at: Date;
};

type TournamentWithCreatorRow = TournamentRow & {
  created_by_username: string;
};

type TeamRow = {
  team_id: string;
  tournament_id: string;
  team_name: string;
  team_logo: string | null;
  created_by_user_id: string;
  created_at: Date;
};

type MatchRow = {
  match_id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  ground_name: string;
  match_type: string;
  overs: number;
  match_no: number;
  status: string;
  toss_winner_team_id: string | null;
  toss_decision: "bat" | "bowl" | null;
  first_batting_team_id: string | null;
  winner_team_id: string | null;
  scheduled_start_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: Date;
  team1_name?: string;
  team2_name?: string;
  toss_winner_team_name?: string | null;
  first_batting_team_name?: string | null;
  winner_team_name?: string | null;
};

type PointsRow = {
  points_table_id: string;
  tournament_id: string;
  team_id: string;
  team_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  no_results: number;
  points: number;
  net_run_rate: number;
  updated_at: Date;
};

async function ensureTournamentOwner(tournamentId: string, userId: string) {
  const result = await pool.query(
    `SELECT tournament_id
     FROM tournaments
     WHERE tournament_id = $1
       AND created_by_user_id = $2
     LIMIT 1`,
    [tournamentId, userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(403, "Tournament not found or you are not authorized");
  }
}

export const tournamentService = {
  createTournament: async (userId: string, body: CreateTournamentBody) => {
    const tournamentName = body.tournamentName.trim();
    const organizationName = body.organizationName.trim();
    const startDate = body.startDate ?? null;
    const endDate = body.endDate ?? null;
    const status = body.status ?? "draft";

    const result = await pool.query<TournamentRow>(
      `INSERT INTO tournaments
       (tournament_name, organization_name, created_by_user_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING tournament_id, tournament_name, organization_name, created_by_user_id, status, start_date, end_date, created_at, updated_at`,
      [tournamentName, organizationName, userId, startDate, endDate, status]
    );

    return result.rows[0];
  },

  getAllTournaments: async () => {
    const result = await pool.query<TournamentWithCreatorRow>(
      `SELECT t.tournament_id,
              t.tournament_name,
              t.organization_name,
              t.created_by_user_id,
              t.status,
              t.start_date,
              t.end_date,
              t.created_at,
              t.updated_at,
              u.username AS created_by_username
       FROM tournaments t
       JOIN users u ON t.created_by_user_id = u.user_id
       ORDER BY t.created_at DESC`
    );

    return result.rows;
  },

  getMyTournaments: async (userId: string) => {
    const result = await pool.query<TournamentRow>(
      `SELECT tournament_id,
              tournament_name,
              organization_name,
              created_by_user_id,
              status,
              start_date,
              end_date,
              created_at,
              updated_at
       FROM tournaments
       WHERE created_by_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  getTournamentById: async (tournamentId: string) => {
    const [tournamentResult, teamsResult, matchesResult, pointsResult] =
      await Promise.all([
        pool.query<TournamentWithCreatorRow>(
          `SELECT t.tournament_id,
                  t.tournament_name,
                  t.organization_name,
                  t.created_by_user_id,
                  t.status,
                  t.start_date,
                  t.end_date,
                  t.created_at,
                  t.updated_at,
                  u.username AS created_by_username
           FROM tournaments t
           JOIN users u ON t.created_by_user_id = u.user_id
           WHERE t.tournament_id = $1
           LIMIT 1`,
          [tournamentId]
        ),

        pool.query<TeamRow>(
          `SELECT team_id,
                  tournament_id,
                  team_name,
                  team_logo,
                  created_by_user_id,
                  created_at
           FROM teams
           WHERE tournament_id = $1
           ORDER BY created_at ASC`,
          [tournamentId]
        ),

        pool.query<MatchRow>(
          `SELECT m.match_id,
                  m.tournament_id,
                  m.team1_id,
                  m.team2_id,
                  m.ground_name,
                  m.match_type,
                  m.overs,
                  m.match_no,
                  m.status,
                  m.toss_winner_team_id,
                  m.toss_decision,
                  m.first_batting_team_id,
                  m.winner_team_id,
                  m.scheduled_start_at,
                  m.started_at,
                  m.ended_at,
                  m.created_at,
                  t1.team_name AS team1_name,
                  t2.team_name AS team2_name,
                  tw.team_name AS toss_winner_team_name,
                  fb.team_name AS first_batting_team_name,
                  wn.team_name AS winner_team_name
           FROM matches m
           JOIN teams t1 ON m.team1_id = t1.team_id
           JOIN teams t2 ON m.team2_id = t2.team_id
           LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
           LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
           LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
           WHERE m.tournament_id = $1
           ORDER BY m.match_no ASC, m.created_at ASC`,
          [tournamentId]
        ),

        pool.query(
          `WITH match_results AS (
             SELECT
               m.match_id,
               m.team1_id,
               m.team2_id,
               m.winner_team_id,
               m.status
             FROM matches m
             WHERE m.tournament_id = $1
               AND m.status = 'completed'
           )
           SELECT
             t.team_id,
             t.team_name,
             COUNT(DISTINCT
               CASE WHEN mr.team1_id = t.team_id OR mr.team2_id = t.team_id
                    THEN mr.match_id END
             )::int AS matches_played,
             COUNT(DISTINCT
               CASE WHEN mr.winner_team_id = t.team_id
                    THEN mr.match_id END
             )::int AS wins,
             COUNT(DISTINCT
               CASE WHEN (mr.team1_id = t.team_id OR mr.team2_id = t.team_id)
                         AND mr.winner_team_id IS NOT NULL
                         AND mr.winner_team_id != t.team_id
                    THEN mr.match_id END
             )::int AS losses,
             COUNT(DISTINCT
               CASE WHEN (mr.team1_id = t.team_id OR mr.team2_id = t.team_id)
                         AND mr.winner_team_id IS NULL
                    THEN mr.match_id END
             )::int AS ties,
             0::int AS no_results,
             (
               COUNT(DISTINCT CASE WHEN mr.winner_team_id = t.team_id THEN mr.match_id END) * 2
               +
               COUNT(DISTINCT CASE WHEN (mr.team1_id = t.team_id OR mr.team2_id = t.team_id)
                                        AND mr.winner_team_id IS NULL
                                   THEN mr.match_id END) * 1
             )::int AS points,
             0.000::numeric AS net_run_rate
           FROM teams t
           LEFT JOIN match_results mr
             ON mr.team1_id = t.team_id OR mr.team2_id = t.team_id
           WHERE t.tournament_id = $1
           GROUP BY t.team_id, t.team_name
           ORDER BY points DESC, team_name ASC`,
          [tournamentId]
        ),

      ]);

    if (tournamentResult.rows.length === 0) {
      throw new ApiError(404, "Tournament not found");
    }

    return {
      tournament: tournamentResult.rows[0],
      teams: teamsResult.rows,
      matches: matchesResult.rows,
      pointsTable: pointsResult.rows,
    };
  },

  updateTournament: async (
    tournamentId: string,
    userId: string,
    body: UpdateTournamentBody
  ) => {
    await ensureTournamentOwner(tournamentId, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (body.tournamentName !== undefined) {
      fields.push(`tournament_name = $${index++}`);
      values.push(body.tournamentName.trim());
    }

    if (body.organizationName !== undefined) {
      fields.push(`organization_name = $${index++}`);
      values.push(body.organizationName.trim());
    }

    if (body.startDate !== undefined) {
      fields.push(`start_date = $${index++}`);
      values.push(body.startDate);
    }

    if (body.endDate !== undefined) {
      fields.push(`end_date = $${index++}`);
      values.push(body.endDate);
    }

    if (body.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(body.status);
    }

    if (fields.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    values.push(tournamentId);

    const result = await pool.query<TournamentRow>(
      `UPDATE tournaments
       SET ${fields.join(", ")}
       WHERE tournament_id = $${index}
       RETURNING tournament_id, tournament_name, organization_name, created_by_user_id, status, start_date, end_date, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Tournament not found");
    }

    return result.rows[0];
  },

  deleteTournament: async (tournamentId: string, userId: string) => {
  await ensureTournamentOwner(tournamentId, userId);

  // ✅ Check if tournament has teams
  const teamCheck = await pool.query(
    `SELECT team_id
     FROM teams
     WHERE tournament_id = $1
     LIMIT 1`,
    [tournamentId]
  );

  if (teamCheck.rows.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete tournament — it contains teams. Delete all teams first."
    );
  }

  const result = await pool.query(
    `DELETE FROM tournaments
     WHERE tournament_id = $1
     RETURNING tournament_id`,
    [tournamentId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Tournament not found");
  }

  return { message: "Tournament deleted successfully" };
},
};