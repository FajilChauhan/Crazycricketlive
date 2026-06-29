import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";
import { UpdateProfileBody } from "./profile.types";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'uploads')
  : "C:\\Users\\fajil\\OneDrive\\Dokumen\\CrazyCricketLiveImages";

type ProfileRow = {
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const mapProfile = (user: ProfileRow) => ({
  userId: user.user_id,
  username: user.username,
  email: user.email,
  profileImage: user.profile_image,
  isActive: user.is_active,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

export const profileService = {
  getMyProfile: async (userId: string) => {
    const result = await pool.query<ProfileRow>(
      `SELECT user_id, username, email, profile_image, is_active, created_at, updated_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    return mapProfile(result.rows[0]);
  },

  updateMyProfile: async (userId: string, body: UpdateProfileBody) => {
    const existingUser = await pool.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (existingUser.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const username = body.username?.trim();
    const profileImage = body.profileImage ?? null;

    let oldImageToDelete: string | null = null;
    if (profileImage) {
      const userResult = await pool.query<ProfileRow>(
        `SELECT profile_image FROM users WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const oldImage = userResult.rows[0]?.profile_image;
      if (oldImage && oldImage !== profileImage && oldImage.startsWith('/api/uploads/')) {
        oldImageToDelete = oldImage;
      }
    }

    if (username) {
      const checkUsername = await pool.query(
        `SELECT user_id
         FROM users
         WHERE LOWER(username) = LOWER($1)
           AND user_id <> $2
         LIMIT 1`,
        [username, userId]
      );

      if (checkUsername.rows.length > 0) {
        throw new ApiError(409, "Username already exists");
      }
    }

    try {
      const result = await pool.query<ProfileRow>(
        `UPDATE users
         SET username = COALESCE($1, username),
             profile_image = COALESCE($2, profile_image),
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING user_id, username, email, profile_image, is_active, created_at, updated_at`,
        [username || null, profileImage, userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, "User not found");
      }

      if (oldImageToDelete) {
        const filename = oldImageToDelete.replace('/api/uploads/', '');
        const oldImagePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error("Failed to delete old profile image:", err);
          }
        }
      }

      return mapProfile(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ApiError(409, "Username already exists");
      }
      throw error;
    }
  },

  getProfileById: async (targetUserId: string) => {
    const result = await pool.query<ProfileRow>(
      `SELECT user_id, username, email, profile_image, is_active, created_at, updated_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [targetUserId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    return mapProfile(result.rows[0]);
  },

  getUserTournaments: async (userId: string) => {
    const result = await pool.query(
      `SELECT tournament_id, tournament_name, organization_name, status, start_date, end_date, created_at
       FROM tournaments
       WHERE created_by_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  getUserTeams: async (userId: string) => {
    const result = await pool.query(
      `SELECT t.team_id, t.team_name, t.team_logo, t.tournament_id, tr.tournament_name, t.created_at
       FROM teams t
       JOIN tournaments tr ON t.tournament_id = tr.tournament_id
       WHERE t.created_by_user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  getUserMatches: async (userId: string) => {
    const result = await pool.query(
      `SELECT DISTINCT m.match_id, m.status, m.ground_name, m.match_type, m.overs, m.match_no, m.created_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name
       FROM matches m
       JOIN match_players mp ON m.match_id = mp.match_id
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE mp.user_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    return result.rows;
  },

  getUserLiveMatches: async (userId: string) => {
    const result = await pool.query(
      `SELECT DISTINCT m.match_id, m.status, m.ground_name, m.match_type, m.overs, m.started_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name
       FROM matches m
       JOIN match_players mp ON m.match_id = mp.match_id
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE mp.user_id = $1
         AND m.status = 'live'
       ORDER BY m.started_at DESC NULLS LAST`,
      [userId]
    );

    return result.rows;
  },

  getUserStats: async (userId: string) => {
    const [
      totalMatchesResult,
      totalRunsResult,
      totalWicketsResult,
      createdTournamentsResult,
      createdTeamsResult,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT match_id)::int AS count
         FROM match_players
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(runs_scored), 0)::int AS total_runs
         FROM ball_by_ball
         WHERE striker_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(CASE WHEN is_wicket = true THEN 1 ELSE 0 END), 0)::int AS total_wickets
         FROM ball_by_ball
         WHERE bowler_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM tournaments
         WHERE created_by_user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM teams
         WHERE created_by_user_id = $1`,
        [userId]
      ),
    ]);

    return {
      totalMatches: totalMatchesResult.rows[0].count,
      totalRuns: totalRunsResult.rows[0].total_runs,
      totalWickets: totalWicketsResult.rows[0].total_wickets,
      createdTournaments: createdTournamentsResult.rows[0].count,
      createdTeams: createdTeamsResult.rows[0].count,
    };
  },
};