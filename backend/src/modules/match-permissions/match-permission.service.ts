import { pool } from "../../config/dbconfig";
import { GrantPermissionBody } from "./match-permission.types";

async function ensureMatchOwnerOrAdmin(matchId: string, userId: string) {
  const result = await pool.query(
    `SELECT 1
     FROM matches m
     WHERE m.match_id = $1 AND (
       EXISTS (
         SELECT 1 FROM tournaments t
         WHERE t.tournament_id = m.tournament_id
         AND t.created_by_user_id = $2
       )
       OR EXISTS (
         SELECT 1 FROM match_permissions mp
         WHERE mp.match_id = m.match_id
         AND mp.user_id = $2
         AND mp.permission_type = 'match_admin'
       )
     )`,
    [matchId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("You are not authorized");
  }
}

export const matchPermissionService = {
  grantPermission: async (matchId: string, grantedByUserId: string, body: GrantPermissionBody) => {
    await ensureMatchOwnerOrAdmin(matchId, grantedByUserId);

    const userCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND is_active = true`,
      [body.userId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error("User not found");
    }

    const matchCheck = await pool.query(
      `SELECT match_id FROM matches WHERE match_id = $1`,
      [matchId]
    );

    if (matchCheck.rows.length === 0) {
      throw new Error("Match not found");
    }

    const result = await pool.query(
      `INSERT INTO match_permissions
       (match_id, user_id, permission_type, granted_by_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (match_id, user_id, permission_type)
       DO UPDATE SET granted_by_user_id = EXCLUDED.granted_by_user_id,
                     created_at = NOW()
       RETURNING *`,
      [matchId, body.userId, body.permissionType, grantedByUserId]
    );

    return result.rows[0];
  },

  listPermissions: async (matchId: string, userId: string) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const result = await pool.query(
      `SELECT mp.permission_id, mp.match_id, mp.user_id, mp.permission_type, mp.granted_by_user_id, mp.created_at,
              u.username, u.email, u.profile_image,
              g.username AS granted_by_username
       FROM match_permissions mp
       JOIN users u ON mp.user_id = u.user_id
       LEFT JOIN users g ON mp.granted_by_user_id = g.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.created_at ASC`,
      [matchId]
    );

    return result.rows;
  },

  checkCurrentUserPermission: async (matchId: string, userId: string) => {
    const result = await pool.query(
      `SELECT permission_type
       FROM match_permissions
       WHERE match_id = $1
         AND user_id = $2
         AND permission_type IN ('score_update', 'match_admin')`,
      [matchId, userId]
    );

    if (result.rows.length === 0) {
      return {
        canUpdateScore: false,
        permissionType: null,
      };
    }

    return {
      canUpdateScore: true,
      permissionType: result.rows[0].permission_type,
    };
  },

  revokePermission: async (matchId: string, permissionId: string, userId: string) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const permissionCheck = await pool.query(
      `SELECT permission_id
       FROM match_permissions
       WHERE permission_id = $1 AND match_id = $2`,
      [permissionId, matchId]
    );

    if (permissionCheck.rows.length === 0) {
      throw new Error("Permission not found");
    }

    await pool.query(
      `DELETE FROM match_permissions
       WHERE permission_id = $1 AND match_id = $2`,
      [permissionId, matchId]
    );

    return { message: "Permission revoked successfully" };
  },
};