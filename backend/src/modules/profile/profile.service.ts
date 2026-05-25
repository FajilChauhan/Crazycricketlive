import { pool } from "../../config/dbconfig";
import { UpdateProfileBody } from "./profile.types";

export const profileService = {
  getMyProfile: async (userId: string) => {
    const result = await pool.query(
      `SELECT user_id, username, email, profile_image, is_active, created_at, updated_at
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  },

  updateMyProfile: async (userId: string, body: UpdateProfileBody) => {
    const existingUser = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1`,
      [userId]
    );

    if (existingUser.rows.length === 0) {
      throw new Error("User not found");
    }

    if (body.username) {
      const checkUsername = await pool.query(
        `SELECT user_id FROM users WHERE username = $1 AND user_id <> $2`,
        [body.username, userId]
      );

      if (checkUsername.rows.length > 0) {
        throw new Error("Username already exists");
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           profile_image = COALESCE($2, profile_image),
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING user_id, username, email, profile_image, is_active, created_at, updated_at`,
      [body.username || null, body.profileImage || null, userId]
    );

    return result.rows[0];
  },

  getProfileById: async (targetUserId: string) => {
    const result = await pool.query(
      `SELECT user_id, username, email, profile_image, is_active, created_at, updated_at
       FROM users
       WHERE user_id = $1`,
      [targetUserId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
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
       WHERE mp.user_id = $1 AND m.status = 'live'
       ORDER BY m.started_at DESC NULLS LAST`,
      [userId]
    );

    return result.rows;
  },

  getUserStats: async (userId: string) => {
    const totalMatches = await pool.query(
      `SELECT COUNT(DISTINCT match_id)::int AS count
       FROM match_players
       WHERE user_id = $1`,
      [userId]
    );

    const totalRuns = await pool.query(
      `SELECT COALESCE(SUM(runs_scored), 0)::int AS total_runs
       FROM ball_by_ball
       WHERE striker_id = $1`,
      [userId]
    );

    const totalWickets = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN is_wicket = true THEN 1 ELSE 0 END), 0)::int AS total_wickets
       FROM ball_by_ball
       WHERE bowler_id = $1`,
      [userId]
    );

    const createdTournaments = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM tournaments
       WHERE created_by_user_id = $1`,
      [userId]
    );

    const createdTeams = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM teams
       WHERE created_by_user_id = $1`,
      [userId]
    );

    return {
      totalMatches: totalMatches.rows[0].count,
      totalRuns: totalRuns.rows[0].total_runs,
      totalWickets: totalWickets.rows[0].total_wickets,
      createdTournaments: createdTournaments.rows[0].count,
      createdTeams: createdTeams.rows[0].count,
    };
  },
};