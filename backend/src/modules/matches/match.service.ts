import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";
import { withTransaction } from "../../shared/utils/withTransaction";
import { emitToMatch } from "../../socket/index";
import {
  AddBallBody,
  AddPlayingXIBody,
  CreateMatchBody,
  SaveScoringStateBody,
  StartInningsBody,
  StatusBody,
  TossBody,
  UpdateMatchBody,
} from "./match.types";

// Lazy-load redis helpers so the service starts even if dist/config/redis.js
// is absent (e.g. a build where redis.ts failed to compile).
type CacheFn = {
  getCache: (key: string) => Promise<string | null>;
  setCache: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  deleteCache: (key: string) => Promise<void>;
};

const _noopCache: CacheFn = {
  getCache: async () => null,
  setCache: async () => {},
  deleteCache: async () => {},
};

let _cache: CacheFn | null = null;

function getRedisCache(): CacheFn {
  if (_cache) return _cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _cache = require("../../config/redis") as CacheFn;
    return _cache;
  } catch {
    return _noopCache;
  }
}

const getCache = (key: string) => getRedisCache().getCache(key);
const setCache = (key: string, value: string, ttlSeconds?: number) =>
  getRedisCache().setCache(key, value, ttlSeconds);
const deleteCache = (key: string) => getRedisCache().deleteCache(key);


type Db = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

type MatchRow = {
  match_id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  status: string;
};

type TournamentAccessRow = {
  tournament_id: string;
};

async function getMatchOrThrow(matchId: string, db: Db = pool): Promise<MatchRow> {
  const result = await db.query(
    `SELECT match_id, tournament_id, team1_id, team2_id, status
     FROM matches
     WHERE match_id = $1
     LIMIT 1`,
    [matchId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Match not found");
  }

  return result.rows[0] as MatchRow;
}

async function ensureMatchOwnerOrAdmin(matchId: string, userId: string, db: Db = pool) {
  const match = await getMatchOrThrow(matchId, db);

  const accessCheck = await db.query(
    `SELECT 1
     FROM tournaments t
     WHERE t.tournament_id = $1
       AND 
         t.created_by_user_id = $2
     LIMIT 1`,
    [match.tournament_id, userId]
  );

  if (accessCheck.rows.length === 0) {
    throw new ApiError(403, "You are not authorized");
  }

  return match;
}

async function ensureScoreUpdateAccess(matchId: string, userId: string, db: Db = pool) {
  const match = await getMatchOrThrow(matchId, db);

  const accessCheck = await db.query(
    `SELECT 1
     FROM tournaments t
     WHERE t.tournament_id = $1
       AND t.created_by_user_id = $2
     LIMIT 1`,
    [match.tournament_id, userId]
  );

  if (accessCheck.rows.length === 0) {
    throw new ApiError(403, "You are not authorized to update this match score");
  }

  return match;
}

export const matchService = {
 createMatch: async (userId: string, body: CreateMatchBody) => {
  const { tournamentId, team1Id, team2Id, groundName, matchType, overs, matchNo, matchMode, scheduledStartAt } = body;

  if (team1Id === team2Id) {
    throw new ApiError(400, "Team 1 and Team 2 must be different");
  }

  const [tournamentCheck, teamCheck] = await Promise.all([
    pool.query<TournamentAccessRow>(
      `SELECT tournament_id
       FROM tournaments
       WHERE tournament_id = $1 AND created_by_user_id = $2
       LIMIT 1`,
      [tournamentId, userId]
    ),
    pool.query(
      `SELECT team_id
       FROM teams
       WHERE tournament_id = $1
         AND team_id IN ($2, $3)`,
      [tournamentId, team1Id, team2Id]
    ),
  ]);

  if (tournamentCheck.rows.length === 0) {
    throw new ApiError(403, "Tournament not found or you are not authorized");
  }

  if (teamCheck.rows.length !== 2) {
    throw new ApiError(404, "One or both teams not found in this tournament");
  }

  // ✅ Create match
  const result = await pool.query(
    `INSERT INTO matches
     (tournament_id, team1_id, team2_id, ground_name, match_type, overs, match_no, match_mode, status, scheduled_start_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'upcoming', $9)
     RETURNING *`,
    [
      tournamentId,
      team1Id,
      team2Id,
      groundName,
      matchType || "league",
      overs,
      matchNo,
      matchMode || "team",
      scheduledStartAt || null,
    ]
  );

  const match = result.rows[0];

  // ✅ Snapshot team members into match_players immediately
  const [team1Members, team2Members] = await Promise.all([
    pool.query(
      `SELECT user_id FROM team_members
       WHERE team_id = $1
       ORDER BY is_captain DESC, joined_at ASC`,
      [team1Id]
    ),
    pool.query(
      `SELECT user_id FROM team_members
       WHERE team_id = $1
       ORDER BY is_captain DESC, joined_at ASC`,
      [team2Id]
    ),
  ]);

  const allMembers = [
    ...team1Members.rows.map((r: any, i: number) => ({
      userId: r.user_id,
      teamId: team1Id,
      order: i + 1,
    })),
    ...team2Members.rows.map((r: any, i: number) => ({
      userId: r.user_id,
      teamId: team2Id,
      order: i + 1,
    })),
  ];

  if (allMembers.length > 0) {
    await Promise.all(
      allMembers.map((m) =>
        pool.query(
          `INSERT INTO match_players
           (match_id, team_id, user_id, batting_order, is_starting_player)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT DO NOTHING`,
          [match.match_id, m.teamId, m.userId, m.order]
        )
      )
    );
  }

  return match;
},

  getMatchesByTournament: async (tournamentId: string) => {
    const result = await pool.query(
      `SELECT m.match_id,
              m.tournament_id,
              m.team1_id,
              m.team2_id,
              m.ground_name,
              m.match_type,
              m.overs,
              m.match_no,
              m.status,
              m.toss_winner_team_id,
              m.toss_decision,
              m.first_batting_team_id,
              m.winner_team_id,
              m.scheduled_start_at,
              m.started_at,
              m.ended_at,
              m.created_at,
              t1.team_name AS team1_name,
              t2.team_name AS team2_name,
              tw.team_name AS toss_winner_team_name,
              fb.team_name AS first_batting_team_name,
              wn.team_name AS winner_team_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
       LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
       LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
       WHERE m.tournament_id = $1
       ORDER BY m.match_no ASC, m.created_at ASC`,
      [tournamentId]
    );

    return result.rows;
  },

  getMatchById: async (matchId: string) => {
    const [matchResult, inningsResult, playersResult] = await Promise.all([
      pool.query(
        `SELECT m.*,
        t1.team_name AS team1_name,
        t2.team_name AS team2_name,
        tw.team_name AS toss_winner_team_name,
        fb.team_name AS first_batting_team_name,
        wn.team_name AS winner_team_name,
        tr.created_by_user_id AS tournament_created_by_user_id,
        mom.username AS man_of_match_username
 FROM matches m
 JOIN teams t1 ON m.team1_id = t1.team_id
 JOIN teams t2 ON m.team2_id = t2.team_id
 LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
 LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
 LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
 LEFT JOIN users mom ON m.man_of_the_match_user_id = mom.user_id
 JOIN tournaments tr ON m.tournament_id = tr.tournament_id
 WHERE m.match_id = $1
 LIMIT 1`,
        [matchId]
      ),
      pool.query(
        `SELECT i.*,
                bt.team_name AS batting_team_name,
                bw.team_name AS bowling_team_name
         FROM innings i
         JOIN teams bt ON i.batting_team_id = bt.team_id
         JOIN teams bw ON i.bowling_team_id = bw.team_id
         WHERE i.match_id = $1
         ORDER BY i.innings_no ASC`,
        [matchId]
      ),
      pool.query(
  `SELECT mp.*,
          u.username,
          u.email,
          u.profile_image,
          tm.is_captain,     
          tm.role AS member_role,
          tm.jersey_number
   FROM match_players mp
   JOIN users u ON mp.user_id = u.user_id
   LEFT JOIN team_members tm
     ON tm.user_id = mp.user_id
     AND tm.team_id = mp.team_id
   WHERE mp.match_id = $1
   ORDER BY mp.team_id, mp.batting_order NULLS LAST, mp.created_at ASC`,
  [matchId]
),
    ]);

    if (matchResult.rows.length === 0) {
      throw new ApiError(404, "Match not found");
    }

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

    if (body.groundName !== undefined) {
      fields.push(`ground_name = $${i++}`);
      values.push(body.groundName);
    }

    if (body.matchType !== undefined) {
      fields.push(`match_type = $${i++}`);
      values.push(body.matchType);
    }

    if (body.overs !== undefined) {
      fields.push(`overs = $${i++}`);
      values.push(body.overs);
    }

    if (body.matchNo !== undefined) {
      fields.push(`match_no = $${i++}`);
      values.push(body.matchNo);
    }

    if (body.scheduledStartAt !== undefined) {
      fields.push(`scheduled_start_at = $${i++}`);
      values.push(body.scheduledStartAt);
    }

    if (body.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(body.status);
    }

    if (fields.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    values.push(matchId);

    const result = await pool.query(
      `UPDATE matches
       SET ${fields.join(", ")}
       WHERE match_id = $${i}
       RETURNING *`,
      values
    );

    const updatedMatch = result.rows[0];
    if (updatedMatch) {
      await deleteCache(`live_score:${matchId}`);
      emitToMatch(matchId, "score_updated", { matchId });
    }

    return updatedMatch;
  },

  deleteMatch: async (matchId: string, userId: string) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    await pool.query(`DELETE FROM matches WHERE match_id = $1`, [matchId]);
    await deleteCache(`live_score:${matchId}`);
    await deleteCache(`scoring_state:${matchId}`);
    emitToMatch(matchId, "match_deleted", { matchId });

    return { message: "Match deleted successfully" };
  },

  updateToss: async (matchId: string, userId: string, body: TossBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const match = await getMatchOrThrow(matchId);

    const tossWinnerTeamId = body.tossWinnerTeamId;
    const tossDecision = body.tossDecision;

    if (tossWinnerTeamId !== match.team1_id && tossWinnerTeamId !== match.team2_id) {
      throw new ApiError(400, "Toss winner must be one of the match teams");
    }

    const firstBattingTeamId =
      tossDecision === "bat"
        ? tossWinnerTeamId
        : tossWinnerTeamId === match.team1_id
          ? match.team2_id
          : match.team1_id;

    const result = await pool.query(
      `UPDATE matches
       SET toss_winner_team_id = $1,
           toss_decision = $2,
           first_batting_team_id = $3
       WHERE match_id = $4
       RETURNING *`,
      [tossWinnerTeamId, tossDecision, firstBattingTeamId, matchId]
    );

    const updatedMatch = result.rows[0];
    await deleteCache(`live_score:${matchId}`);
    emitToMatch(matchId, "score_updated", { matchId });

    return updatedMatch;
  },

  updateStatus: async (matchId: string, userId: string, body: StatusBody) => {
  await ensureMatchOwnerOrAdmin(matchId, userId);

  // status comes as lowercase from frontend — matches DB constraint
  await pool.query(
    `UPDATE matches SET status = $1 WHERE match_id = $2`,
    [body.status, matchId]
  );

  if (body.status === "live") {
    await pool.query(
      `UPDATE matches SET started_at = COALESCE(started_at, NOW()) WHERE match_id = $1`,
      [matchId]
    );
  }

  if (body.status === "completed") {
    await pool.query(
      `UPDATE matches SET ended_at = NOW() WHERE match_id = $1`,
      [matchId]
    );
  }

  const result = await pool.query(
    `SELECT * FROM matches WHERE match_id = $1`,
    [matchId]
  );

  const updatedMatch = result.rows[0];
  await deleteCache(`live_score:${matchId}`);
  emitToMatch(matchId, "score_updated", { matchId });

  return updatedMatch;
},

  addPlayingXI: async (matchId: string, userId: string, body: AddPlayingXIBody) => {
    await ensureMatchOwnerOrAdmin(matchId, userId);

    const { teamId, playerIds } = body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      throw new ApiError(400, "At least one player is required");
    }

    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      throw new ApiError(400, "Duplicate players found in playing XI");
    }

    const match = await getMatchOrThrow(matchId);
    if (teamId !== match.team1_id && teamId !== match.team2_id) {
      throw new ApiError(400, "Team is not part of this match");
    }

    const rosterCheck = await pool.query(
      `SELECT user_id
       FROM team_members
       WHERE team_id = $1
         AND user_id = ANY($2::uuid[])`,
      [teamId, playerIds]
    );

    if (rosterCheck.rows.length !== playerIds.length) {
      throw new ApiError(400, "One or more players do not belong to this team");
    }

    const result = await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM match_players
         WHERE match_id = $1 AND team_id = $2`,
        [matchId, teamId]
      );

      const insertedRows = await Promise.all(
        playerIds.map((playerId, idx) =>
          client.query(
            `INSERT INTO match_players
             (match_id, team_id, user_id, batting_order, is_starting_player)
             VALUES ($1, $2, $3, $4, true)
             RETURNING *`,
            [matchId, teamId, playerId, idx + 1]
          )
        )
      );

      return insertedRows.map((row) => row.rows[0]);
    });

    return {
      message: "Playing XI saved successfully",
      players: result,
    };
  },

  getPlayingXI: async (matchId: string) => {
    const result = await pool.query(
      `SELECT mp.*,
              u.username,
              u.email,
              u.profile_image
       FROM match_players mp
       JOIN users u ON mp.user_id = u.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.team_id, mp.batting_order ASC NULLS LAST, mp.created_at ASC`,
      [matchId]
    );

    return result.rows;
  },

  startInnings: async (matchId: string, userId: string, body: StartInningsBody) => {
  await ensureScoreUpdateAccess(matchId, userId);

  const match = await getMatchOrThrow(matchId);

  if (
    match.status === "completed" ||
    match.status === "cancelled" ||
    match.status === "abandoned"
  ) {
    throw new ApiError(400, "Cannot start innings for a closed match");
  }

  if (body.battingTeamId === body.bowlingTeamId) {
    throw new ApiError(400, "Batting and bowling teams must be different");
  }

  // ✅ FIX — use match1_id/team2_id correctly
  const isTeam1Batting =
    body.battingTeamId === match.team1_id ||
    body.battingTeamId === match.team2_id;

  const isTeam1Bowling =
    body.bowlingTeamId === match.team1_id ||
    body.bowlingTeamId === match.team2_id;

  if (!isTeam1Batting || !isTeam1Bowling) {
    throw new ApiError(400, "Batting or bowling team is not part of this match");
  }

  let targetRuns = body.targetRuns || null;

  // ✅ Auto-calculate target from innings 1 when starting innings 2
  if (body.inningsNo >= 2) {
    const inn1Result = await pool.query(
      `SELECT runs FROM innings WHERE match_id = $1 AND innings_no = 1 AND is_completed = true LIMIT 1`,
      [matchId]
    );
    if (inn1Result.rows.length > 0) {
      targetRuns = inn1Result.rows[0].runs + 1; // need 1 more than innings 1 total
    }
  }

  const result = await pool.query(
    `INSERT INTO innings
     (match_id, innings_no, batting_team_id, bowling_team_id, target_runs)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      matchId,
      body.inningsNo,
      body.battingTeamId,
      body.bowlingTeamId,
      targetRuns,
    ]
  );

  const innings = result.rows[0];
  await deleteCache(`live_score:${matchId}`);
  emitToMatch(matchId, "score_updated", { matchId });

  return innings;
},

  endInnings: async (matchId: string, userId: string, inningsId: string) => {
    await ensureScoreUpdateAccess(matchId, userId);

    const result = await pool.query(
      `UPDATE innings
       SET is_completed = true
       WHERE innings_id = $1 AND match_id = $2
       RETURNING *`,
      [inningsId, matchId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Innings not found");
    }

    const innings = result.rows[0];
    await deleteCache(`live_score:${matchId}`);
    emitToMatch(matchId, "score_updated", { matchId });

    return innings;
  },

  getInnings: async (matchId: string) => {
    const result = await pool.query(
      `SELECT i.*,
              bt.team_name AS batting_team_name,
              bw.team_name AS bowling_team_name
       FROM innings i
       JOIN teams bt ON i.batting_team_id = bt.team_id
       JOIN teams bw ON i.bowling_team_id = bw.team_id
       WHERE i.match_id = $1
       ORDER BY i.innings_no ASC`,
      [matchId]
    );

    return result.rows;
  },

  addBall: async (matchId: string, userId: string, body: AddBallBody) => {
    const result = await withTransaction(async (client) => {
      const match = await ensureScoreUpdateAccess(matchId, userId, client);

      if (match.status !== "live") {
        throw new ApiError(400, "Match must be live to add a ball");
      }

      const inningsCheck = await client.query(
        `SELECT innings_id, match_id, innings_no, batting_team_id, bowling_team_id, is_completed
         FROM innings
         WHERE innings_id = $1 AND match_id = $2
         LIMIT 1`,
        [body.inningsId, matchId]
      );

      if (inningsCheck.rows.length === 0) {
        throw new ApiError(404, "Innings not found");
      }

      if (inningsCheck.rows[0].is_completed) {
        throw new ApiError(400, "This innings is already completed");
      }

      const uniquePlayers = new Set([
        body.strikerId,
        body.nonStrikerId,
        body.bowlerId,
      ].filter(Boolean));

      if (uniquePlayers.size < [
        body.strikerId,
        body.nonStrikerId,
        body.bowlerId,
      ].filter(Boolean).length) {
        throw new ApiError(400, "Duplicate player references are not allowed in one delivery");
      }

      const isLegalDelivery =
        body.isLegalDelivery ??
        !(body.extraType === "wide" || body.extraType === "no_ball");

      const runsScored = Number(body.runsScored || 0);
      const extraRuns = Number(body.extraRuns || 0);
      const totalRuns = runsScored + extraRuns;

      const ballResult = await client.query(
        `INSERT INTO ball_by_ball
         (match_id, innings_id, delivery_number, over_number, ball_in_over,
          striker_id, non_striker_id, bowler_id,
          runs_scored, extra_runs, extra_type,
          is_legal_delivery, is_wicket, wicket_type, commentary)
         VALUES ($1, $2, (SELECT COALESCE(MAX(delivery_number), 0) + 1 FROM ball_by_ball WHERE innings_id = $2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          matchId,
          body.inningsId,
          body.overNumber,
          body.ballInOver,
          body.strikerId || null,
          body.nonStrikerId || null,
          body.bowlerId || null,
          runsScored,
          extraRuns,
          body.extraType || null,
          isLegalDelivery,
          body.isWicket ?? false,
          body.wicketType || null,
          body.commentary || null,
        ]
      );

      const inningsUpdate = await client.query(
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
          totalRuns,
          extraRuns,
          isLegalDelivery,
          body.isWicket ?? false,
          runsScored,
          body.inningsId,
        ]
      );

      return {
        ball: ballResult.rows[0],
        innings: inningsUpdate.rows[0],
      };
    });

    await deleteCache(`live_score:${matchId}`);
    emitToMatch(matchId, "score_updated", { matchId });

    return result;
  },

  getBalls: async (matchId: string) => {
    const result = await pool.query(
      `SELECT *
       FROM ball_by_ball
       WHERE match_id = $1
       ORDER BY innings_id, over_number, ball_in_over, delivery_number`,
      [matchId]
    );

    return result.rows;
  },

  getLiveScore: async (matchId: string) => {
    const cacheKey = `live_score:${matchId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (err) {
        // Fallback to querying DB if parse fails
      }
    }

    const [matchResult, inningsResult, lastBallsResult] = await Promise.all([
      pool.query(
        `SELECT m.*,
                t1.team_name AS team1_name,
                t2.team_name AS team2_name,
                tw.team_name AS toss_winner_team_name,
                fb.team_name AS first_batting_team_name,
                wn.team_name AS winner_team_name
         FROM matches m
         JOIN teams t1 ON m.team1_id = t1.team_id
         JOIN teams t2 ON m.team2_id = t2.team_id
         LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
         LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
         LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
         WHERE m.match_id = $1
         LIMIT 1`,
        [matchId]
      ),
      pool.query(
        `SELECT i.*,
                bt.team_name AS batting_team_name,
                bw.team_name AS bowling_team_name
         FROM innings i
         JOIN teams bt ON i.batting_team_id = bt.team_id
         JOIN teams bw ON i.bowling_team_id = bw.team_id
         WHERE i.match_id = $1
         ORDER BY i.innings_no ASC`,
        [matchId]
      ),
      pool.query(
        `SELECT *
         FROM ball_by_ball
         WHERE match_id = $1
         ORDER BY created_at DESC
         LIMIT 6`,
        [matchId]
      ),
    ]);

    if (matchResult.rows.length === 0) {
      throw new ApiError(404, "Match not found");
    }

    const liveScore = {
      match: matchResult.rows[0],
      innings: inningsResult.rows,
      lastBalls: lastBallsResult.rows,
    };

    await setCache(cacheKey, JSON.stringify(liveScore), 300);

    return liveScore;
  },

  getScorecard: async (matchId: string) => {
    const [inningsResult, ballsResult] = await Promise.all([
      pool.query(
        `SELECT i.*,
                bt.team_name AS batting_team_name,
                bw.team_name AS bowling_team_name
         FROM innings i
         JOIN teams bt ON i.batting_team_id = bt.team_id
         JOIN teams bw ON i.bowling_team_id = bw.team_id
         WHERE i.match_id = $1
         ORDER BY i.innings_no ASC`,
        [matchId]
      ),
      pool.query(
        `SELECT *
         FROM ball_by_ball
         WHERE match_id = $1
         ORDER BY innings_id, over_number, ball_in_over, delivery_number`,
        [matchId]
      ),
    ]);

    return {
      innings: inningsResult.rows,
      balls: ballsResult.rows,
    };
  },

  getBattingScorecard: async (matchId: string, inningsId?: string) => {
    const params: any[] = [matchId];
    let inningsFilter = "";
    if (inningsId) {
      params.push(inningsId);
      inningsFilter = `AND bb.innings_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT bb.striker_id AS user_id,
              u.username,
              bb.innings_id,
              COALESCE(SUM(bb.runs_scored), 0)::int AS runs,
              COUNT(*) FILTER (WHERE bb.is_legal_delivery = true)::int AS balls,
              COALESCE(SUM(CASE WHEN bb.runs_scored = 4 THEN 1 ELSE 0 END), 0)::int AS fours,
              COALESCE(SUM(CASE WHEN bb.runs_scored = 6 THEN 1 ELSE 0 END), 0)::int AS sixes,
              MAX(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END)::int AS is_out
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.striker_id = u.user_id
       WHERE bb.match_id = $1
         AND bb.striker_id IS NOT NULL
         ${inningsFilter}
       GROUP BY bb.striker_id, u.username, bb.innings_id
       ORDER BY bb.innings_id, runs DESC, balls ASC`,
      params
    );

    return result.rows;
  },

  getBowlingScorecard: async (matchId: string, inningsId?: string) => {
    const params: any[] = [matchId];
    let inningsFilter = "";
    if (inningsId) {
      params.push(inningsId);
      inningsFilter = `AND bb.innings_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT bb.bowler_id AS user_id,
              u.username,
              bb.innings_id,
              COUNT(*) FILTER (WHERE bb.is_legal_delivery = true)::int AS balls,
              COALESCE(SUM(bb.runs_scored + bb.extra_runs), 0)::int AS runs_conceded,
              COALESCE(SUM(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END), 0)::int AS wickets
       FROM ball_by_ball bb
       LEFT JOIN users u ON bb.bowler_id = u.user_id
       WHERE bb.match_id = $1
         AND bb.bowler_id IS NOT NULL
         ${inningsFilter}
       GROUP BY bb.bowler_id, u.username, bb.innings_id
       ORDER BY bb.innings_id, wickets DESC, runs_conceded ASC`,
      params
    );

    return result.rows;
  },

  getSummary: async (matchId: string) => {
    const [matchResult, inningsResult, topBattingResult, topBowlingResult] = await Promise.all([
      pool.query(
        `SELECT m.*,
                t1.team_name AS team1_name,
                t2.team_name AS team2_name,
                tw.team_name AS toss_winner_team_name,
                fb.team_name AS first_batting_team_name,
                wn.team_name AS winner_team_name
         FROM matches m
         JOIN teams t1 ON m.team1_id = t1.team_id
         JOIN teams t2 ON m.team2_id = t2.team_id
         LEFT JOIN teams tw ON m.toss_winner_team_id = tw.team_id
         LEFT JOIN teams fb ON m.first_batting_team_id = fb.team_id
         LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
         WHERE m.match_id = $1
         LIMIT 1`,
        [matchId]
      ),
      pool.query(
        `SELECT i.*,
                bt.team_name AS batting_team_name,
                bw.team_name AS bowling_team_name
         FROM innings i
         JOIN teams bt ON i.batting_team_id = bt.team_id
         JOIN teams bw ON i.bowling_team_id = bw.team_id
         WHERE i.match_id = $1
         ORDER BY i.innings_no ASC`,
        [matchId]
      ),
      pool.query(
        `SELECT bb.striker_id AS user_id,
                u.username,
                COALESCE(SUM(bb.runs_scored), 0)::int AS runs
         FROM ball_by_ball bb
         LEFT JOIN users u ON bb.striker_id = u.user_id
         WHERE bb.match_id = $1
           AND bb.striker_id IS NOT NULL
         GROUP BY bb.striker_id, u.username
         ORDER BY runs DESC
         LIMIT 5`,
        [matchId]
      ),
      pool.query(
        `SELECT bb.bowler_id AS user_id,
                u.username,
                COALESCE(SUM(CASE WHEN bb.is_wicket = true THEN 1 ELSE 0 END), 0)::int AS wickets
         FROM ball_by_ball bb
         LEFT JOIN users u ON bb.bowler_id = u.user_id
         WHERE bb.match_id = $1
           AND bb.bowler_id IS NOT NULL
         GROUP BY bb.bowler_id, u.username
         ORDER BY wickets DESC
         LIMIT 5`,
        [matchId]
      ),
    ]);

    if (matchResult.rows.length === 0) {
      throw new ApiError(404, "Match not found");
    }

    return {
      match: matchResult.rows[0],
      innings: inningsResult.rows,
      topBatting: topBattingResult.rows,
      topBowling: topBowlingResult.rows,
    };
  },

  getPlayerStatus: async (matchId: string) => {
    const result = await pool.query(
      `SELECT mp.team_id,
              mp.user_id,
              u.username,
              mp.role,
              mp.is_captain,
              mp.batting_order,
              mp.is_starting_player
       FROM match_players mp
       JOIN users u ON mp.user_id = u.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.team_id, mp.batting_order NULLS LAST, mp.created_at ASC`,
      [matchId]
    );

    return result.rows;
  },

  getPlayerHistory: async (userId: string) => {
    const result = await pool.query(
      `SELECT DISTINCT
              m.match_id,
              m.status,
              m.ground_name,
              m.match_type,
              m.overs,
              m.match_no,
              m.created_at,
              m.winner_team_id,
              m.started_at,
              m.ended_at,
              tr.tournament_id,
              tr.tournament_name,
              t1.team_name AS team1_name,
              t1.team_id   AS team1_id,
              t2.team_name AS team2_name,
              t2.team_id   AS team2_id,
              wn.team_name AS winner_team_name,
              mp.team_id   AS player_team_id,
              CASE WHEN mp.team_id = m.team1_id THEN t1.team_name
                   WHEN mp.team_id = m.team2_id THEN t2.team_name END AS player_team_name
       FROM matches m
       JOIN tournaments tr ON m.tournament_id = tr.tournament_id
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       LEFT JOIN teams wn ON m.winner_team_id = wn.team_id
       JOIN match_players mp ON m.match_id = mp.match_id AND mp.user_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    return result.rows;
  },


  // In match.service.ts
declareWinner: async (matchId: string, userId: string, body: {
  winnerTeamId: string;
  winMargin?: number;
  winType?: string;
  manOfTheMatchUserId?: string;
}) => {
  await ensureMatchOwnerOrAdmin(matchId, userId);

  // Try to save MOTM — gracefully skip if column doesn't exist yet
  try {
    if (body.manOfTheMatchUserId) {
      await pool.query(
        `UPDATE matches SET man_of_the_match_user_id = $1 WHERE match_id = $2`,
        [body.manOfTheMatchUserId, matchId]
      );
    }
  } catch (_) { /* column may not exist yet */ }

  const result = await pool.query(
    `UPDATE matches
     SET winner_team_id = $1,
         status = 'completed',
         ended_at = NOW()
     WHERE match_id = $2
     RETURNING *`,
    [body.winnerTeamId, matchId]
  );

  const updatedMatch = result.rows[0];
  await deleteCache(`live_score:${matchId}`);
  emitToMatch(matchId, "score_updated", { matchId });

  return updatedMatch;
},

declareTie: async (matchId: string, userId: string) => {
  await ensureMatchOwnerOrAdmin(matchId, userId);

  const result = await pool.query(
    `UPDATE matches
     SET status = 'completed',
         ended_at = NOW()
     WHERE match_id = $1
     RETURNING *`,
    [matchId]
  );

  const updatedMatch = result.rows[0];
  await deleteCache(`live_score:${matchId}`);
  emitToMatch(matchId, "score_updated", { matchId });

  return updatedMatch;
},

  getPlayerStats: async (userId: string) => {
    const [matchesPlayedResult, totalRunsResult, totalWicketsResult, createdTournamentsResult, createdTeamsResult] =
      await Promise.all([
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
      totalMatches: matchesPlayedResult.rows[0].count,
      totalRuns: totalRunsResult.rows[0].total_runs,
      totalWickets: totalWicketsResult.rows[0].total_wickets,
      createdTournaments: createdTournamentsResult.rows[0].count,
      createdTeams: createdTeamsResult.rows[0].count,
    };
  },

  getScoringState: async (matchId: string) => {
    const cacheKey = `scoring_state:${matchId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (err) {
        // Fallback
      }
    }

    const result = await pool.query(
      `SELECT
         mss.*,
         s.username  AS striker_username,
         ns.username AS non_striker_username,
         b.username  AS bowler_username,
         ob.username AS out_batsman_username
       FROM match_scoring_state mss
       LEFT JOIN users s  ON mss.striker_id     = s.user_id
       LEFT JOIN users ns ON mss.non_striker_id  = ns.user_id
       LEFT JOIN users b  ON mss.bowler_id       = b.user_id
       LEFT JOIN users ob ON mss.out_batsman_id  = ob.user_id
       WHERE mss.match_id = $1
       LIMIT 1`,
      [matchId]
    );

    const state = result.rows[0] ?? null;
    if (state) {
      await setCache(cacheKey, JSON.stringify(state), 300);
    }
    return state;
  },

saveScoringState: async (matchId: string, userId: string, body: SaveScoringStateBody) => {
  await ensureScoreUpdateAccess(matchId, userId);

  const result = await pool.query(
    `INSERT INTO match_scoring_state
       (match_id, phase, striker_id, non_striker_id, bowler_id,
        out_batsman_id, retired_ids, dismissed_ids,
        new_batsman_reason, wicket_was_last_ball, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (match_id) DO UPDATE SET
       phase                = EXCLUDED.phase,
       striker_id           = EXCLUDED.striker_id,
       non_striker_id       = EXCLUDED.non_striker_id,
       bowler_id            = EXCLUDED.bowler_id,
       out_batsman_id       = EXCLUDED.out_batsman_id,
       retired_ids          = EXCLUDED.retired_ids,
       dismissed_ids        = EXCLUDED.dismissed_ids,
       new_batsman_reason   = EXCLUDED.new_batsman_reason,
       wicket_was_last_ball = EXCLUDED.wicket_was_last_ball,
       updated_at           = NOW()
     RETURNING *`,
    [
      matchId,
      body.phase,
      body.strikerId    || null,
      body.nonStrikerId || null,
      body.bowlerId     || null,
      body.outBatsmanId || null,
      body.retiredIds   ?? [],
      body.dismissedIds ?? [],
      body.newBatsmanReason ?? "wicket",
      body.wicketWasLastBall ?? false,
    ]
  );

  const state = result.rows[0];
  await setCache(`scoring_state:${matchId}`, JSON.stringify(state), 300);
  emitToMatch(matchId, "scoring_state_updated", state);

  return state;
},

clearScoringState: async (matchId: string, userId: string) => {
  await ensureScoreUpdateAccess(matchId, userId);

  await pool.query(
    `DELETE FROM match_scoring_state WHERE match_id = $1`,
    [matchId]
  );

  await deleteCache(`scoring_state:${matchId}`);
  emitToMatch(matchId, "scoring_state_cleared", { matchId });

  return { success: true };
},
};