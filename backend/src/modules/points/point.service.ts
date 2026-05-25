import { pool } from "../../config/dbconfig";

function calculatePoints(wins: number, ties: number, noResults: number) {
  return wins * 2 + ties + noResults;
}

export const pointService = {
  refreshPointsTable: async (tournamentId: string, userId: string) => {
    const tournamentCheck = await pool.query(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) {
      throw new Error("Tournament not found or you are not authorized");
    }

    const teamsResult = await pool.query(
      `SELECT team_id
       FROM teams
       WHERE tournament_id = $1`,
      [tournamentId]
    );

    const teams = teamsResult.rows;

    for (const team of teams) {
      const teamId = team.team_id;

      const matchesPlayedResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM matches
         WHERE tournament_id = $1
           AND status = 'completed'
           AND (team1_id = $2 OR team2_id = $2)`,
        [tournamentId, teamId]
      );

      const winsResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM matches
         WHERE tournament_id = $1
           AND status = 'completed'
           AND winner_team_id = $2`,
        [tournamentId, teamId]
      );

      const lossesResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM matches
         WHERE tournament_id = $1
           AND status = 'completed'
           AND winner_team_id IS NOT NULL
           AND winner_team_id <> $2
           AND (team1_id = $2 OR team2_id = $2)`,
        [tournamentId, teamId]
      );

      const tiesResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM matches
         WHERE tournament_id = $1
           AND status = 'completed'
           AND winner_team_id IS NULL
           AND (team1_id = $2 OR team2_id = $2)`,
        [tournamentId, teamId]
      );

      const noResultsResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM matches
         WHERE tournament_id = $1
           AND status IN ('abandoned', 'cancelled')
           AND (team1_id = $2 OR team2_id = $2)`,
        [tournamentId, teamId]
      );

      const matchesPlayed = matchesPlayedResult.rows[0].count;
      const wins = winsResult.rows[0].count;
      const losses = lossesResult.rows[0].count;
      const ties = tiesResult.rows[0].count;
      const noResults = noResultsResult.rows[0].count;
      const points = calculatePoints(wins, ties, noResults);

      // Net run rate is a placeholder here.
      // In production, calculate it from runs scored / overs faced.
      const netRunRate = 0;

      await pool.query(
        `INSERT INTO points_table
         (tournament_id, team_id, matches_played, wins, losses, ties, no_results, points, net_run_rate, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (tournament_id, team_id)
         DO UPDATE SET
           matches_played = EXCLUDED.matches_played,
           wins = EXCLUDED.wins,
           losses = EXCLUDED.losses,
           ties = EXCLUDED.ties,
           no_results = EXCLUDED.no_results,
           points = EXCLUDED.points,
           net_run_rate = EXCLUDED.net_run_rate,
           updated_at = NOW()`,
        [
          tournamentId,
          teamId,
          matchesPlayed,
          wins,
          losses,
          ties,
          noResults,
          points,
          netRunRate,
        ]
      );
    }

    return { message: "Points table refreshed successfully" };
  },

  getPointsTable: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT pt.points_table_id,
              pt.tournament_id,
              pt.team_id,
              tm.team_name,
              pt.matches_played,
              pt.wins,
              pt.losses,
              pt.ties,
              pt.no_results,
              pt.points,
              pt.net_run_rate,
              pt.updated_at
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       WHERE pt.tournament_id = $1
       ORDER BY pt.points DESC, pt.net_run_rate DESC, tm.team_name ASC`,
      [tournamentId]
    );

    return result.rows;
  },

  getTeamStanding: async (tournamentId: string, teamId: string) => {
    const result = await pool.query(
      `SELECT pt.points_table_id,
              pt.tournament_id,
              pt.team_id,
              tm.team_name,
              pt.matches_played,
              pt.wins,
              pt.losses,
              pt.ties,
              pt.no_results,
              pt.points,
              pt.net_run_rate,
              pt.updated_at
       FROM points_table pt
       JOIN teams tm ON pt.team_id = tm.team_id
       WHERE pt.tournament_id = $1 AND pt.team_id = $2`,
      [tournamentId, teamId]
    );

    if (result.rows.length === 0) {
      throw new Error("Standing not found for this team");
    }

    return result.rows[0];
  },

  resetPointsTable: async (tournamentId: string, userId: string) => {
    const tournamentCheck = await pool.query(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) {
      throw new Error("Tournament not found or you are not authorized");
    }

    await pool.query(
      `DELETE FROM points_table WHERE tournament_id = $1`,
      [tournamentId]
    );

    return { message: "Points table reset successfully" };
  },
};