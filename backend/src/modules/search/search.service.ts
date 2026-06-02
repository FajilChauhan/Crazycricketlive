import { pool } from "../../config/dbconfig";
import { ApiError } from "../../utils/ApiError";

const buildSearchTerm = (q: string) => `%${q.trim()}%`;

export const searchService = {
  searchAll: async (q: string) => {
    const search = q?.trim();

    if (!search) {
      return {
        users: [],
        tournaments: [],
        teams: [],
        matches: [],
      };
    }

    const term = buildSearchTerm(search);

    try {
      const [
        usersResult,
        tournamentsResult,
        teamsResult,
        matchesResult,
      ] = await Promise.all([
        pool.query(
          `SELECT user_id,
                  username,
                  email,
                  profile_image
           FROM users
           WHERE username ILIKE $1
              OR email ILIKE $1
           ORDER BY username ASC
           LIMIT 20`,
          [term]
        ),

        pool.query(
          `SELECT tournament_id,
                  tournament_name,
                  organization_name,
                  status,
                  created_at
           FROM tournaments
           WHERE tournament_name ILIKE $1
              OR organization_name ILIKE $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [term]
        ),

        pool.query(
          `SELECT team_id,
                  team_name,
                  team_logo,
                  tournament_id,
                  created_at
           FROM teams
           WHERE team_name ILIKE $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [term]
        ),

        pool.query(
          `SELECT m.match_id,
                  m.status,
                  m.ground_name,
                  m.match_type,
                  m.overs,
                  m.created_at,
                  t1.team_name AS team1_name,
                  t2.team_name AS team2_name
           FROM matches m
           JOIN teams t1 ON m.team1_id = t1.team_id
           JOIN teams t2 ON m.team2_id = t2.team_id
           WHERE m.ground_name ILIKE $1
              OR m.match_type ILIKE $1
              OR t1.team_name ILIKE $1
              OR t2.team_name ILIKE $1
           ORDER BY m.created_at DESC
           LIMIT 20`,
          [term]
        ),
      ]);

      return {
        users: usersResult.rows,
        tournaments: tournamentsResult.rows,
        teams: teamsResult.rows,
        matches: matchesResult.rows,
      };
    } catch {
      throw new ApiError(500, "Failed to search");
    }
  },

  searchUsers: async (q: string) => {
    const search = q?.trim();

    if (!search) return [];

    const result = await pool.query(
      `SELECT user_id,
              username,
              email,
              profile_image
       FROM users
       WHERE username ILIKE $1
          OR email ILIKE $1
       ORDER BY username ASC
       LIMIT 20`,
      [buildSearchTerm(search)]
    );

    return result.rows;
  },

  searchTournaments: async (q: string) => {
    const search = q?.trim();

    if (!search) return [];

    const result = await pool.query(
      `SELECT tournament_id,
              tournament_name,
              organization_name,
              status,
              created_at
       FROM tournaments
       WHERE tournament_name ILIKE $1
          OR organization_name ILIKE $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [buildSearchTerm(search)]
    );

    return result.rows;
  },

  searchTeams: async (q: string) => {
    const search = q?.trim();

    if (!search) return [];

    const result = await pool.query(
      `SELECT team_id,
              team_name,
              team_logo,
              tournament_id,
              created_at
       FROM teams
       WHERE team_name ILIKE $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [buildSearchTerm(search)]
    );

    return result.rows;
  },

  searchMatches: async (q: string) => {
    const search = q?.trim();

    if (!search) return [];

    const result = await pool.query(
      `SELECT m.match_id,
              m.status,
              m.ground_name,
              m.match_type,
              m.overs,
              m.created_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE m.ground_name ILIKE $1
          OR m.match_type ILIKE $1
          OR t1.team_name ILIKE $1
          OR t2.team_name ILIKE $1
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [buildSearchTerm(search)]
    );

    return result.rows;
  },
};