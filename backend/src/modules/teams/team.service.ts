import { pool } from "../../config/dbconfig";
import { ApiError } from "../../utils/ApiError";
import { CreateTeamBody, UpdateTeamBody } from "./team.types";

type TeamRow = {
  team_id: string;
  tournament_id: string;
  team_name: string;
  team_logo: string | null;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

type TeamMemberRow = {
  team_member_id: string;
  team_id: string;
  user_id: string;
  role: string;
  is_captain: boolean;
  jersey_number: number | null;
  joined_at: Date;
  username: string;
  email: string;
  profile_image: string | null;
};

async function ensureTeamOwner(teamId: string, userId: string) {
  const result = await pool.query(
    `SELECT team_id
     FROM teams
     WHERE team_id = $1
       AND created_by_user_id = $2
     LIMIT 1`,
    [teamId, userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(403, "Team not found or you are not authorized");
  }
}

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

export const teamService = {
  createTeam: async (userId: string, body: CreateTeamBody) => {
    const tournamentId = body.tournamentId;
    const teamName = body.teamName.trim();
    const teamLogo = body.teamLogo ?? null;

    await ensureTournamentOwner(tournamentId, userId);

    try {
      const result = await pool.query<TeamRow>(
        `INSERT INTO teams (tournament_id, team_name, team_logo, created_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING team_id, tournament_id, team_name, team_logo, created_by_user_id, created_at, updated_at`,
        [tournamentId, teamName, teamLogo, userId]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ApiError(
          409,
          "Team name already exists in this tournament"
        );
      }

      throw error;
    }
  },

  getTeamById: async (teamId: string) => {
    const [teamResult, membersResult] = await Promise.all([
      pool.query<TeamRow & { created_by_username: string; tournament_name: string }>(
        `SELECT t.team_id,
                t.tournament_id,
                t.team_name,
                t.team_logo,
                t.created_by_user_id,
                t.created_at,
                t.updated_at,
                u.username AS created_by_username,
                tr.tournament_name
         FROM teams t
         JOIN users u ON t.created_by_user_id = u.user_id
         JOIN tournaments tr ON t.tournament_id = tr.tournament_id
         WHERE t.team_id = $1
         LIMIT 1`,
        [teamId]
      ),
      pool.query<TeamMemberRow>(
        `SELECT tm.team_member_id,
                tm.team_id,
                tm.user_id,
                tm.role,
                tm.is_captain,
                tm.jersey_number,
                tm.joined_at,
                u.username,
                u.email,
                u.profile_image
         FROM team_members tm
         JOIN users u ON tm.user_id = u.user_id
         WHERE tm.team_id = $1
         ORDER BY tm.is_captain DESC, tm.joined_at ASC`,
        [teamId]
      ),
    ]);

    if (teamResult.rows.length === 0) {
      throw new ApiError(404, "Team not found");
    }

    return {
      team: teamResult.rows[0],
      members: membersResult.rows,
    };
  },

  getTeamsByTournament: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT t.team_id,
              t.tournament_id,
              t.team_name,
              t.team_logo,
              t.created_by_user_id,
              t.created_at,
              t.updated_at,
              u.username AS created_by_username
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
      `SELECT t.team_id,
              t.tournament_id,
              t.team_name,
              t.team_logo,
              t.created_by_user_id,
              t.created_at,
              t.updated_at,
              tr.tournament_name
       FROM teams t
       JOIN tournaments tr ON t.tournament_id = tr.tournament_id
       WHERE t.created_by_user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  updateTeam: async (teamId: string, userId: string, body: UpdateTeamBody) => {
    await ensureTeamOwner(teamId, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (body.teamName !== undefined) {
      fields.push(`team_name = $${index++}`);
      values.push(body.teamName.trim());
    }

    if (body.teamLogo !== undefined) {
      fields.push(`team_logo = $${index++}`);
      values.push(body.teamLogo);
    }

    if (fields.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    values.push(teamId);

    try {
      const query = `
        UPDATE teams
        SET ${fields.join(", ")}
        WHERE team_id = $${index}
        RETURNING team_id, tournament_id, team_name, team_logo, created_by_user_id, created_at, updated_at
      `;

      const result = await pool.query<TeamRow>(query, values);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Team not found");
      }

      return result.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ApiError(
          409,
          "Team name already exists in this tournament"
        );
      }

      throw error;
    }
  },

  deleteTeam: async (teamId: string, userId: string) => {
    await ensureTeamOwner(teamId, userId);

    const result = await pool.query(
      `DELETE FROM teams
       WHERE team_id = $1
       RETURNING team_id`,
      [teamId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Team not found");
    }

    return { message: "Team deleted successfully" };
  },
};