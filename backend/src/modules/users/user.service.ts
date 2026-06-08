import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";
import { UpdateUserBody, UserResponse } from "./user.types";

type UserRow = {
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  created_at: Date;
};

async function mapUser(user: UserRow): Promise<UserResponse> {
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    profileImage: user.profile_image,
    createdAt: user.created_at,
  };
}

async function ensureUserExists(userId: string) {
  const result = await pool.query(
    `SELECT user_id
     FROM users
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found");
  }
}

export const userService = {
  getAllUsers: async (page: number = 1, limit: number = 10, search?: string) => {
    const offset = (page - 1) * limit;

    let query = `SELECT user_id, username, email, profile_image, created_at FROM users`;
    const params: any[] = [];

    if (search) {
      query += ` WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $2`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      pool.query<UserRow>(query, params),
      pool.query(
        search
          ? `SELECT COUNT(*) as total FROM users WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $2`
          : `SELECT COUNT(*) as total FROM users`,
        search ? [`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`] : []
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const users = await Promise.all(usersResult.rows.map(mapUser));

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  getUserById: async (userId: string) => {
    await ensureUserExists(userId);

    const result = await pool.query<UserRow>(
      `SELECT user_id, username, email, profile_image, created_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    return mapUser(result.rows[0]);
  },

  updateUser: async (userId: string, body: UpdateUserBody) => {
    await ensureUserExists(userId);

    const { username, profileImage } = body;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await pool.query(
        `SELECT user_id
         FROM users
         WHERE LOWER(username) = $1 AND user_id != $2
         LIMIT 1`,
        [username.toLowerCase(), userId]
      );

      if (existingUser.rows.length > 0) {
        throw new ApiError(409, "Username already taken");
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`);
      params.push(username.trim());
      paramIndex++;
    }

    if (profileImage !== undefined) {
      updates.push(`profile_image = $${paramIndex}`);
      params.push(profileImage || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    params.push(userId);

    const result = await pool.query<UserRow>(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE user_id = $${paramIndex}
       RETURNING user_id, username, email, profile_image, created_at`,
      params
    );

    return mapUser(result.rows[0]);
  },

  deleteUser: async (userId: string) => {
    await ensureUserExists(userId);

    const result = await pool.query(
      `DELETE FROM users
       WHERE user_id = $1
       RETURNING user_id, username, email`,
      [userId]
    );

    return {
      message: "User deleted successfully",
      user: result.rows[0],
    };
  },

  getUsersByTeam: async (teamId: string) => {
    const result = await pool.query<UserRow>(
      `SELECT DISTINCT u.user_id, u.username, u.email, u.profile_image, u.created_at
       FROM users u
       JOIN team_members tm ON u.user_id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY u.username ASC`,
      [teamId]
    );

    return Promise.all(result.rows.map(mapUser));
  },

  getUsersByTournament: async (tournamentId: string) => {
    const result = await pool.query<UserRow>(
      `SELECT DISTINCT u.user_id, u.username, u.email, u.profile_image, u.created_at
       FROM users u
       JOIN team_members tm ON u.user_id = tm.user_id
       JOIN teams t ON tm.team_id = t.team_id
       WHERE t.tournament_id = $1
       ORDER BY u.username ASC`,
      [tournamentId]
    );

    return Promise.all(result.rows.map(mapUser));
  },

  getAvailableUsersForTournament: async (tournamentId: string) => {
    const result = await pool.query<UserRow>(
      `SELECT u.user_id, u.username, u.email, u.profile_image, u.created_at
       FROM users u
       WHERE u.user_id NOT IN (
         SELECT DISTINCT tm.user_id
         FROM team_members tm
         JOIN teams t ON tm.team_id = t.team_id
         WHERE t.tournament_id = $1
       )
       ORDER BY u.username ASC`,
      [tournamentId]
    );

    return Promise.all(result.rows.map(mapUser));
  },
};
