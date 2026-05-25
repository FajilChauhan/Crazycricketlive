import { pool } from "../../config/dbconfig";
import { CreateTournamentBody, UpdateTournamentBody } from "./tournament.types";

export const tournamentService = {
  createTournament: async (userId: string, body: CreateTournamentBody) => {
    const { tournamentName, organizationName, startDate, endDate, status } = body;

    const result = await pool.query(
      `INSERT INTO tournaments
       (tournament_name, organization_name, created_by_user_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tournamentName,
        organizationName,
        userId,
        startDate || null,
        endDate || null,
        status || "draft",
      ]
    );

    return result.rows[0];
  },

  getAllTournaments: async () => {
    const result = await pool.query(
      `SELECT t.*, u.username AS created_by_username
       FROM tournaments t
       JOIN users u ON t.created_by_user_id = u.user_id
       ORDER BY t.created_at DESC`
    );

    return result.rows;
  },

  getMyTournaments: async (userId: string) => {
    const result = await pool.query(
      `SELECT *
       FROM tournaments
       WHERE created_by_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  getTournamentById: async (tournamentId: string) => {
    const tournamentResult = await pool.query(
      `SELECT t.*, u.username AS created_by_username
       FROM tournaments t
       JOIN users u ON t.created_by_user_id = u.user_id
       WHERE t.tournament_id = $1`,
      [tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      throw new Error("Tournament not found");
    }

    const teamsResult = await pool.query(
      `SELECT team_id, team_name, team_logo, created_by_user_id, created_at
       FROM teams
       WHERE tournament_id = $1
       ORDER BY created_at ASC`,
      [tournamentId]
    );

    const matchesResult = await pool.query(
      `SELECT match_id, tournament_id, team1_id, team2_id, ground_name, match_type, overs, match_no, status,
              toss_winner_team_id, toss_decision, first_batting_team_id, winner_team_id,
              scheduled_start_at, started_at, ended_at, created_at
       FROM matches
       WHERE tournament_id = $1
       ORDER BY match_no ASC, created_at ASC`,
      [tournamentId]
    );

    const pointsResult = await pool.query(
      `SELECT pt.*, tm.team_name
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       WHERE pt.tournament_id = $1
       ORDER BY pt.points DESC, pt.net_run_rate DESC`,
      [tournamentId]
    );

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
    const ownershipCheck = await pool.query(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [tournamentId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      throw new Error("Tournament not found or you are not authorized");
    }

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (body.tournamentName !== undefined) {
      fields.push(`tournament_name = $${index++}`);
      values.push(body.tournamentName);
    }

    if (body.organizationName !== undefined) {
      fields.push(`organization_name = $${index++}`);
      values.push(body.organizationName);
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
      throw new Error("No fields to update");
    }

    values.push(tournamentId);

    const query = `
      UPDATE tournaments
      SET ${fields.join(", ")}
      WHERE tournament_id = $${index}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    return result.rows[0];
  },

  deleteTournament: async (tournamentId: string, userId: string) => {
    const ownershipCheck = await pool.query(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [tournamentId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      throw new Error("Tournament not found or you are not authorized");
    }

    await pool.query(`DELETE FROM tournaments WHERE tournament_id = $1`, [tournamentId]);

    return { message: "Tournament deleted successfully" };
  },
};