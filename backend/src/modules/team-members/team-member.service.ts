import { pool } from "../../config/dbconfig";
import { AddTeamMemberBody, UpdateTeamMemberBody } from "./team-member.types";

export const teamMemberService = {
  addTeamMember: async (teamId: string, ownerUserId: string, body: AddTeamMemberBody) => {
    const { userId, role, isCaptain, jerseyNumber } = body;

    const teamCheck = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE team_id = $1 AND created_by_user_id = $2`,
      [teamId, ownerUserId]
    );

    if (teamCheck.rows.length === 0) {
      throw new Error("Team not found or you are not authorized");
    }

    const userCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error("User not found");
    }

    const existingMember = await pool.query(
      `SELECT team_member_id
       FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (existingMember.rows.length > 0) {
      throw new Error("Player already exists in this team");
    }

    if (isCaptain === true) {
      await pool.query(
        `UPDATE team_members
         SET is_captain = false, role = 'player'
         WHERE team_id = $1`,
        [teamId]
      );
    }

    const result = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, is_captain, jersey_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        teamId,
        userId,
        role || (isCaptain ? "captain" : "player"),
        isCaptain || false,
        jerseyNumber || null,
      ]
    );

    return result.rows[0];
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
       WHERE tm.team_id = $1 AND tm.user_id = $2`,
      [teamId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Team member not found");
    }

    return result.rows[0];
  },

  updateTeamMember: async (
    teamId: string,
    ownerUserId: string,
    memberUserId: string,
    body: UpdateTeamMemberBody
  ) => {
    const teamCheck = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE team_id = $1 AND created_by_user_id = $2`,
      [teamId, ownerUserId]
    );

    if (teamCheck.rows.length === 0) {
      throw new Error("Team not found or you are not authorized");
    }

    const memberCheck = await pool.query(
      `SELECT team_member_id, is_captain
       FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, memberUserId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error("Team member not found");
    }

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (body.role !== undefined) {
      fields.push(`role = $${index++}`);
      values.push(body.role);
    }

    if (body.isCaptain !== undefined) {
      fields.push(`is_captain = $${index++}`);
      values.push(body.isCaptain);
    }

    if (body.jerseyNumber !== undefined) {
      fields.push(`jersey_number = $${index++}`);
      values.push(body.jerseyNumber);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    if (body.isCaptain === true) {
      await pool.query(
        `UPDATE team_members
         SET is_captain = false
         WHERE team_id = $1 AND user_id <> $2`,
        [teamId, memberUserId]
      );
    }

    values.push(teamId, memberUserId);

    const query = `
      UPDATE team_members
      SET ${fields.join(", ")}
      WHERE team_id = $${index++} AND user_id = $${index}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    return result.rows[0];
  },

  deleteTeamMember: async (teamId: string, ownerUserId: string, memberUserId: string) => {
    const teamCheck = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE team_id = $1 AND created_by_user_id = $2`,
      [teamId, ownerUserId]
    );

    if (teamCheck.rows.length === 0) {
      throw new Error("Team not found or you are not authorized");
    }

    const memberCheck = await pool.query(
      `SELECT team_member_id
       FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, memberUserId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error("Team member not found");
    }

    await pool.query(
      `DELETE FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, memberUserId]
    );

    return { message: "Team member removed successfully" };
  },
};