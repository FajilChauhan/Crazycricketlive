import { pool } from "../../config/dbconfig";
import { ApiError } from "../../utils/ApiError";
import { withTransaction } from "../../utils/withTransaction";
import { AddTeamMemberBody, UpdateTeamMemberBody } from "./team-member.types";

type TeamOwnerRow = {
  team_id: string;
};

type TeamMemberRow = {
  team_member_id: string;
  team_id: string;
  user_id: string;
  role: string;
  is_captain: boolean;
  jersey_number: number | null;
  joined_at: Date;
};

async function ensureTeamOwner(teamId: string, ownerUserId: string) {
  const result = await pool.query<TeamOwnerRow>(
    `SELECT team_id
     FROM teams
     WHERE team_id = $1
       AND created_by_user_id = $2
     LIMIT 1`,
    [teamId, ownerUserId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(403, "Team not found or you are not authorized");
  }
}

async function getTeamMember(teamId: string, userId: string) {
  const result = await pool.query<TeamMemberRow>(
    `SELECT team_member_id, team_id, user_id, role, is_captain, jersey_number, joined_at
     FROM team_members
     WHERE team_id = $1
       AND user_id = $2
     LIMIT 1`,
    [teamId, userId]
  );

  return result.rows[0] || null;
}

export const teamMemberService = {
  addTeamMember: async (
    teamId: string,
    ownerUserId: string,
    body: AddTeamMemberBody
  ) => {
    await ensureTeamOwner(teamId, ownerUserId);

    const userId = body.userId;
    const isCaptain = body.isCaptain ?? false;
    const role = body.role ?? (isCaptain ? "captain" : "player");
    const jerseyNumber = body.jerseyNumber ?? null;

    const [userCheck, memberCheck] = await Promise.all([
      pool.query(
        `SELECT user_id
         FROM users
         WHERE user_id = $1
           AND is_active = true
         LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT team_member_id
         FROM team_members
         WHERE team_id = $1
           AND user_id = $2
         LIMIT 1`,
        [teamId, userId]
      ),
    ]);

    if (userCheck.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    if (memberCheck.rows.length > 0) {
      throw new ApiError(409, "Player already exists in this team");
    }

    const result = await withTransaction(async (client) => {
      if (isCaptain) {
        await client.query(
          `UPDATE team_members
           SET is_captain = false,
               role = 'player'
           WHERE team_id = $1`,
          [teamId]
        );
      }

      const insertResult = await client.query<TeamMemberRow>(
        `INSERT INTO team_members
         (team_id, user_id, role, is_captain, jersey_number)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING team_member_id, team_id, user_id, role, is_captain, jersey_number, joined_at`,
        [teamId, userId, role, isCaptain, jerseyNumber]
      );

      return insertResult.rows[0];
    });

    return result;
  },

  getTeamMembers: async (teamId: string) => {
    const result = await pool.query(
      `SELECT tm.team_member_id, tm.team_id, tm.user_id, tm.role, tm.is_captain, tm.jersey_number, tm.joined_at,
              u.username, u.email, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.is_captain DESC, tm.joined_at ASC`,
      [teamId]
    );

    return result.rows;
  },

  getTeamMemberByUserId: async (teamId: string, userId: string) => {
    const result = await pool.query(
      `SELECT tm.team_member_id, tm.team_id, tm.user_id, tm.role, tm.is_captain, tm.jersey_number, tm.joined_at,
              u.username, u.email, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id = $1
         AND tm.user_id = $2
       LIMIT 1`,
      [teamId, userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Team member not found");
    }

    return result.rows[0];
  },

  updateTeamMember: async (
    teamId: string,
    ownerUserId: string,
    memberUserId: string,
    body: UpdateTeamMemberBody
  ) => {
    await ensureTeamOwner(teamId, ownerUserId);

    const member = await getTeamMember(teamId, memberUserId);
    if (!member) {
      throw new ApiError(404, "Team member not found");
    }

    if (
      body.role === undefined &&
      body.isCaptain === undefined &&
      body.jerseyNumber === undefined
    ) {
      throw new ApiError(400, "No fields to update");
    }

    const updated = await withTransaction(async (client) => {
      if (body.isCaptain === true) {
        await client.query(
          `UPDATE team_members
           SET is_captain = false,
               role = 'player'
           WHERE team_id = $1
             AND user_id <> $2`,
          [teamId, memberUserId]
        );
      }

      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (body.role !== undefined) {
        fields.push(`role = $${i++}`);
        values.push(body.role);
      }

      if (body.isCaptain !== undefined) {
        fields.push(`is_captain = $${i++}`);
        values.push(body.isCaptain);
      }

      if (body.jerseyNumber !== undefined) {
        fields.push(`jersey_number = $${i++}`);
        values.push(body.jerseyNumber);
      }

      values.push(teamId, memberUserId);

      const query = `
        UPDATE team_members
        SET ${fields.join(", ")}
        WHERE team_id = $${i++}
          AND user_id = $${i}
        RETURNING team_member_id, team_id, user_id, role, is_captain, jersey_number, joined_at
      `;

      const result = await client.query<TeamMemberRow>(query, values);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Team member not found");
      }

      return result.rows[0];
    });

    return updated;
  },

  deleteTeamMember: async (
    teamId: string,
    ownerUserId: string,
    memberUserId: string
  ) => {
    await ensureTeamOwner(teamId, ownerUserId);

    const member = await getTeamMember(teamId, memberUserId);
    if (!member) {
      throw new ApiError(404, "Team member not found");
    }

    if (member.is_captain) {
      throw new ApiError(
        400,
        "Assign another captain before removing the current captain"
      );
    }

    await pool.query(
      `DELETE FROM team_members
       WHERE team_id = $1
         AND user_id = $2`,
      [teamId, memberUserId]
    );

    return { message: "Team member removed successfully" };
  },
};