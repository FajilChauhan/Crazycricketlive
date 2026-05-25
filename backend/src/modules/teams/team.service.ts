import { pool } from "../../config/dbconfig";
import { CreateTeamBody, UpdateTeamBody } from "./team.types";

export const teamService = {
  createTeam: async (userId: string, body: CreateTeamBody) => {
    const { tournamentId, teamName, teamLogo } = body;

    const tournamentCheck = await pool.query(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) {
      throw new Error("Tournament not found or you are not authorized");
    }

    const result = await pool.query(
      `INSERT INTO teams (tournament_id, team_name, team_logo, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tournamentId, teamName, teamLogo || null, userId]
    );

    return result.rows[0];
  },

  getTeamById: async (teamId: string) => {
    const teamResult = await pool.query(
      `SELECT t.*, u.username AS created_by_username, tr.tournament_name
       FROM teams t
       JOIN users u ON t.created_by_user_id = u.user_id
       JOIN tournaments tr ON t.tournament_id = tr.tournament_id
       WHERE t.team_id = $1`,
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      throw new Error("Team not found");
    }

    const membersResult = await pool.query(
      `SELECT tm.team_member_id, tm.team_id, tm.user_id, tm.role, tm.is_captain, tm.jersey_number,
              u.username, u.email, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.is_captain DESC, tm.joined_at ASC`,
      [teamId]
    );

    return {
      team: teamResult.rows[0],
      members: membersResult.rows,
    };
  },

  getTeamsByTournament: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT t.*, u.username AS created_by_username
       FROM teams t
       JOIN users u ON t.created_by_user_id = u.user_id
       WHERE t.tournament_id = $1
       ORDER BY t.created_at ASC`,
      [tournamentId]
    );

    return result.rows;
  },

  getMyTeams: async (userId: string) => {
    const result = await pool.query(
      `SELECT t.*, tr.tournament_name
       FROM teams t
       JOIN tournaments tr ON t.tournament_id = tr.tournament_id
       WHERE t.created_by_user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  updateTeam: async (teamId: string, userId: string, body: UpdateTeamBody) => {
    const ownershipCheck = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE team_id = $1 AND created_by_user_id = $2`,
      [teamId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      throw new Error("Team not found or you are not authorized");
    }

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (body.teamName !== undefined) {
      fields.push(`team_name = $${index++}`);
      values.push(body.teamName);
    }

    if (body.teamLogo !== undefined) {
      fields.push(`team_logo = $${index++}`);
      values.push(body.teamLogo);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(teamId);

    const query = `
      UPDATE teams
      SET ${fields.join(", ")}
      WHERE team_id = $${index}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    return result.rows[0];
  },

  deleteTeam: async (teamId: string, userId: string) => {
    const ownershipCheck = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE team_id = $1 AND created_by_user_id = $2`,
      [teamId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      throw new Error("Team not found or you are not authorized");
    }

    await pool.query(`DELETE FROM teams WHERE team_id = $1`, [teamId]);

    return { message: "Team deleted successfully" };
  },
};