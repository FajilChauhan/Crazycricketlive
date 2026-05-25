import { pool } from "../../config/dbconfig";
import {
  AddBallBody,
  AddPlayingXIBody,
  CreateMatchBody,
  StartInningsBody,
  StatusBody,
  TossBody,
  UpdateMatchBody,
} from "./match.types";

async function ensureMatchAdmin(matchId: string, userId: string) {
  const result = await pool.query(
    `SELECT 1
     FROM match_permissions
     WHERE match_id = $1
       AND user_id = $2
       AND permission_type IN ('score_update', 'match_admin')`,
    [matchId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("You are not authorized to manage this match");
  }
}

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

export const matchService = {
  createMatch: async (userId: string, body: CreateMatchBody) => {
    const tournamentCheck = await pool.query(
      `SELECT tournament_id FROM tournaments WHERE tournament_id = $1 AND created_by_user_id = $2`,
      [body.tournamentId, userId]
    );

    if (tournamentCheck.rows.length === 0) throw new Error("Tournament not found or unauthorized");

    if (body.team1Id === body.team2Id) throw new Error("Team 1 and Team 2 must be different");

    const teamCheck = await pool.query(
      `SELECT team_id FROM teams WHERE team_id IN ($1, $2) AND tournament_id = $3`,
      [body.team1Id, body.team2Id, body.tournamentId]
    );

    if (teamCheck.rows.length !== 2) throw new Error("One or both teams not found in this tournament");

    const result = await pool.query(
      `INSERT INTO matches
       (tournament_id, team1_id, team2_id, ground_name, match_type, overs, match_no, status, scheduled_start_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8)
       RETURNING *`,
      [
        body.tournamentId,
        body.team1Id,
        body.team2Id,
        body.groundName,
        body.matchType || "league",
        body.overs,
        body.matchNo,
        body.scheduledStartAt || null,
      ]
    );

    return result.rows[0];
  },

  getMatchesByTournament: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT m.*, 
              t1.team_name AS team1_name,
              t2.team_name AS team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE m.tournament_id = $1
       ORDER BY m.match_no ASC, m.created_at ASC`,
      [tournamentId]
    );
    return result.rows;
  },

  getMatchById: async (matchId: string) => {
    const matchResult = await pool.query(
      `SELECT m.*,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name,
              tw.team_name AS toss_winner_team_name,
              fw.team_name AS first_batting_team_name,
              w.team_name AS winner_team_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
       LEFT JOIN teams fw ON m.first_batting_team_id = fw.team_id
       LEFT JOIN teams w ON m.winner_team_id = w.team_id
       WHERE m.match_id = $1`,
      [matchId]
    );

    if (matchResult.rows.length === 0) throw new Error("Match not found");

    const inningsResult = await pool.query(
      `SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_no ASC`,
      [matchId]
    );

    const playersResult = await pool.query(
      `SELECT mp.*, u.username, u.profile_image
       FROM match_players mp
       JOIN users u ON mp.user_id = u.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.team_id, mp.batting_order NULLS LAST`,
      [matchId]
    );

    return {
      match: matchResult.rows[0],
      innings: inningsResult.rows,
      players: playersResult.rows,
    };
  },

  updateMatch: async (matchId: string, userId: string, body: UpdateMatchBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (body.groundName !== undefined) { fields.push(`ground_name = $${i++}`); values.push(body.groundName); }
    if (body.matchType !== undefined) { fields.push(`match_type = $${i++}`); values.push(body.matchType); }
    if (body.overs !== undefined) { fields.push(`overs = $${i++}`); values.push(body.overs); }
    if (body.matchNo !== undefined) { fields.push(`match_no = $${i++}`); values.push(body.matchNo); }
    if (body.scheduledStartAt !== undefined) { fields.push(`scheduled_start_at = $${i++}`); values.push(body.scheduledStartAt); }
    if (body.status !== undefined) { fields.push(`status = $${i++}`); values.push(body.status); }

    if (fields.length === 0) throw new Error("No fields to update");

    values.push(matchId);

    const result = await pool.query(
      `UPDATE matches
       SET ${fields.join(", ")}
       WHERE match_id = $${i}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  deleteMatch: async (matchId: string, userId: string) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    await pool.query(`DELETE FROM matches WHERE match_id = $1`, [matchId]);
    return { message: "Match deleted successfully" };
  },

  updateToss: async (matchId: string, userId: string, body: TossBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const match = await pool.query(`SELECT team1_id, team2_id FROM matches WHERE match_id = $1`, [matchId]);
    if (match.rows.length === 0) throw new Error("Match not found");

    const { team1_id, team2_id } = match.rows[0];
    if (body.tossWinnerTeamId !== team1_id && body.tossWinnerTeamId !== team2_id) {
      throw new Error("Toss winner must be one of the match teams");
    }

    const firstBattingTeamId = body.tossDecision === "bat"
      ? body.tossWinnerTeamId
      : (body.tossWinnerTeamId === team1_id ? team2_id : team1_id);

    const result = await pool.query(
      `UPDATE matches
       SET toss_winner_team_id = $1,
           toss_decision = $2,
           first_batting_team_id = $3
       WHERE match_id = $4
       RETURNING *`,
      [body.tossWinnerTeamId, body.tossDecision, firstBattingTeamId, matchId]
    );

    return result.rows[0];
  },

  updateStatus: async (matchId: string, userId: string, body: StatusBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const result = await pool.query(
      `UPDATE matches
       SET status = $1,
           started_at = CASE WHEN $1 = 'live' THEN COALESCE(started_at, NOW()) ELSE started_at END,
           ended_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE ended_at END
       WHERE match_id = $2
       RETURNING *`,
      [body.status, matchId]
    );

    return result.rows[0];
  },

  addPlayingXI: async (matchId: string, userId: string, body: AddPlayingXIBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const teamCheck = await pool.query(
      `SELECT team_id FROM matches WHERE match_id = $1 AND (team1_id = $2 OR team2_id = $2)`,
      [matchId, body.teamId]
    );
    if (teamCheck.rows.length === 0) throw new Error("Team not part of this match");

    await pool.query(`DELETE FROM match_players WHERE match_id = $1 AND team_id = $2`, [matchId, body.teamId]);

    for (let idx = 0; idx < body.playerIds.length; idx++) {
      await pool.query(
        `INSERT INTO match_players (match_id, team_id, user_id, batting_order, is_starting_player)
         VALUES ($1, $2, $3, $4, true)`,
        [matchId, body.teamId, body.playerIds[idx], idx + 1]
      );
    }

    return { message: "Playing XI saved successfully" };
  },

  getPlayingXI: async (matchId: string) => {
    const result = await pool.query(
      `SELECT mp.*, u.username, u.profile_image, u.email
       FROM match_players mp
       JOIN users u ON mp.user_id = u.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.team_id, mp.batting_order ASC`,
      [matchId]
    );
    return result.rows;
  },

  startInnings: async (matchId: string, userId: string, body: StartInningsBody) => {
    await ensureMatchAdmin(matchId, userId);

    const result = await pool.query(
      `INSERT INTO innings (match_id, innings_no, batting_team_id, bowling_team_id, target_runs)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [matchId, body.inningsNo, body.battingTeamId, body.bowlingTeamId, body.targetRuns || null]
    );
    return result.rows[0];
  },

  endInnings: async (matchId: string, userId: string, inningsId: string) => {
    await ensureMatchAdmin(matchId, userId);

    const result = await pool.query(
      `UPDATE innings
       SET is_completed = true
       WHERE innings_id = $1 AND match_id = $2
       RETURNING *`,
      [inningsId, matchId]
    );

    if (result.rows.length === 0) throw new Error("Innings not found");
    return result.rows[0];
  },

  getInnings: async (matchId: string) => {
    const result = await pool.query(
      `SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_no ASC`,
      [matchId]
    );
    return result.rows;
  },

  addBall: async (matchId: string, userId: string, body: AddBallBody) => {
    await ensureMatchAdmin(matchId, userId);

    const insert = await pool.query(
      `INSERT INTO ball_by_ball
       (match_id, innings_id, delivery_number, over_number, ball_in_over, striker_id, non_striker_id, bowler_id,
        runs_scored, extra_runs, extra_type, is_legal_delivery, is_wicket, wicket_type, commentary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        matchId,
        body.inningsId,
        1, // we can calculate proper delivery number in service later
        body.overNumber,
        body.ballInOver,
        body.strikerId || null,
        body.nonStrikerId || null,
        body.bowlerId || null,
        body.runsScored,
        body.extraRuns || 0,
        body.extraType || null,
        body.isLegalDelivery ?? true,
        body.isWicket ?? false,
        body.wicketType || null,
        body.commentary || null,
      ]
    );

    const inningsUpdate = await pool.query(
      `UPDATE innings
       SET runs = runs + $1,
           extras = extras + $2,
           balls_bowled = balls_bowled + CASE WHEN $3 = true THEN 1 ELSE 0 END,
           wickets = wickets + CASE WHEN $4 = true THEN 1 ELSE 0 END,
           fours = fours + CASE WHEN $5 = 4 THEN 1 ELSE 0 END,
           sixes = sixes + CASE WHEN $5 = 6 THEN 1 ELSE 0 END
       WHERE innings_id = $6
       RETURNING *`,
      [
        body.runsScored + (body.extraRuns || 0),
        body.extraRuns || 0,
        body.isLegalDelivery ?? true,
        body.isWicket ?? false,
        body.runsScored,
        body.inningsId,
      ]
    );

    return {
      ball: insert.rows[0],
      innings: inningsUpdate.rows[0],
    };
  },

  getBalls: async (matchId: string) => {
    const result = await pool.query(
      `SELECT * FROM ball_by_ball WHERE match_id = $1 ORDER BY innings_id, over_number, ball_in_over`,
      [matchId]
    );
    return result.rows;
  },

  getLiveScore: async (matchId: string) => {
    const match = await pool.query(
      `SELECT m.*, 
              t1.team_name AS team1_name,
              t2.team_name AS team2_name,
              tw.team_name AS toss_winner_team_name,
              fb.team_name AS first_batting_team_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
       LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
       WHERE m.match_id = $1`,
      [matchId]
    );

    const innings = await pool.query(
      `SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_no ASC`,
      [matchId]
    );

    const lastBalls = await pool.query(
      `SELECT * FROM ball_by_ball WHERE match_id = $1 ORDER BY created_at DESC LIMIT 6`,
      [matchId]
    );

    return {
      match: match.rows[0],
      innings: innings.rows,
      lastBalls: lastBalls.rows,
    };
  },

  getScorecard: async (matchId: string) => {
    const innings = await pool.query(
      `SELECT i.*,
              t.team_name AS batting_team_name
       FROM innings i
       JOIN teams t ON i.batting_team_id = t.team_id
       WHERE i.match_id = $1
       ORDER BY i.innings_no ASC`,
      [matchId]
    );

    const balls = await pool.query(
      `SELECT * FROM ball_by_ball WHERE match_id = $1 ORDER BY innings_id, over_number, ball_in_over`,
      [matchId]
    );

    return {
      innings: innings.rows,
      balls: balls.rows,
    };
  },

  getBattingScorecard: async (matchId: string) => {
    const result = await pool.query(
      `SELECT bb.striker_id AS user_id,
              u.username,
              SUM(bb.runs_scored) AS runs,
              COUNT(*) FILTER (WHERE bb.is_legal_delivery = true) AS balls,
              SUM(CASE WHEN bb.runs_scored = 4 THEN 1 ELSE 0 END) AS fours,
              SUM(CASE WHEN bb.runs_scored = 6 THEN 1 ELSE 0 END) AS sixes
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.striker_id = u.user_id
       WHERE bb.match_id = $1
       GROUP BY bb.striker_id, u.username
       ORDER BY runs DESC`,
      [matchId]
    );
    return result.rows;
  },

  getBowlingScorecard: async (matchId: string) => {
    const result = await pool.query(
      `SELECT bb.bowler_id AS user_id,
              u.username,
              COUNT(*) FILTER (WHERE bb.is_legal_delivery = true) AS balls,
              SUM(bb.runs_scored + bb.extra_runs) AS runs_conceded,
              SUM(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END) AS wickets
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.bowler_id = u.user_id
       WHERE bb.match_id = $1
       GROUP BY bb.bowler_id, u.username
       ORDER BY wickets DESC, runs_conceded ASC`,
      [matchId]
    );
    return result.rows;
  },

  getSummary: async (matchId: string) => {
    const match = await pool.query(
      `SELECT m.*, t1.team_name AS team1_name, t2.team_name AS team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE m.match_id = $1`,
      [matchId]
    );

    const innings = await pool.query(
      `SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_no ASC`,
      [matchId]
    );

    const topBatting = await pool.query(
      `SELECT bb.striker_id AS user_id, u.username, SUM(bb.runs_scored) AS runs
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.striker_id = u.user_id
       WHERE bb.match_id = $1
       GROUP BY bb.striker_id, u.username
       ORDER BY runs DESC
       LIMIT 5`,
      [matchId]
    );

    const topBowling = await pool.query(
      `SELECT bb.bowler_id AS user_id, u.username, SUM(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END) AS wickets
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.bowler_id = u.user_id
       WHERE bb.match_id = $1
       GROUP BY bb.bowler_id, u.username
       ORDER BY wickets DESC
       LIMIT 5`,
      [matchId]
    );

    return {
      match: match.rows[0],
      innings: innings.rows,
      topBatting: topBatting.rows,
      topBowling: topBowling.rows,
    };
  },

  getPlayerStatus: async (matchId: string) => {
    const result = await pool.query(
      `SELECT mp.team_id, mp.user_id, u.username, mp.role, mp.is_captain, mp.batting_order
       FROM match_players mp
       JOIN users u ON mp.user_id = u.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.team_id, mp.batting_order NULLS LAST`,
      [matchId]
    );
    return result.rows;
  },

  getPlayerHistory: async (userId: string) => {
    const result = await pool.query(
      `SELECT m.match_id, m.status, m.ground_name, m.match_type, m.overs, m.created_at,
              t1.team_name AS team1_name, t2.team_name AS team2_name
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

  getPlayerStats: async (userId: string) => {
    const batting = await pool.query(
      `SELECT COALESCE(SUM(runs_scored),0) AS total_runs
       FROM ball_by_ball
       WHERE striker_id = $1`,
      [userId]
    );

    const bowling = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN is_wicket = true THEN 1 ELSE 0 END),0) AS total_wickets
       FROM ball_by_ball
       WHERE bowler_id = $1`,
      [userId]
    );

    return {
      totalRuns: batting.rows[0].total_runs,
      totalWickets: bowling.rows[0].total_wickets,
    };
  },
};