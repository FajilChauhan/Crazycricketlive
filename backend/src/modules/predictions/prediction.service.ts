import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";

interface PredictionResult {
  matchId: string;
  status: string;
  scorePrediction?: {
    low: number;
    mid: number;
    high: number;
    rr: number;
    projected: string;
  } | null;
  winProbability: {
    team1: string;
    team2: string;
    team1_prob: number;
    team2_prob: number;
    status: string;
  };
}

export const predictionService = {
  predictMatch: async (matchId: string): Promise<PredictionResult> => {
    // 1. Fetch the match details
    const matchRes = await pool.query(
      `SELECT m.*, 
              t1.team_name AS team1_name, 
              t2.team_name AS team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.team_id
       JOIN teams t2 ON m.team2_id = t2.team_id
       WHERE m.match_id = $1
       LIMIT 1`,
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      throw new ApiError(404, "Match not found");
    }

    const match = matchRes.rows[0];
    const totalOvers = match.overs;
    const totalBalls = totalOvers * 6;

    // Fetch active/completed innings for this match
    const inningsRes = await pool.query(
      `SELECT * FROM innings 
       WHERE match_id = $1 
       ORDER BY innings_no ASC`,
      [matchId]
    );

    const innings = inningsRes.rows;
    const activeInnings = innings.find((i) => !i.is_completed);
    const completedInnings = innings.find((i) => i.is_completed && i.innings_no === 1);

    let scorePrediction = null;
    let battingProb = 50;
    let bowlingProb = 50;
    let statusText = "Match yet to start";

    if (match.status === "live" && activeInnings) {
      const currentRuns = activeInnings.runs || 0;
      const currentBalls = activeInnings.balls_bowled || 0;
      const currentWickets = activeInnings.wickets || 0;
      const inningsNo = activeInnings.innings_no;

      const currentRr = currentBalls > 0 ? (currentRuns / currentBalls) * 6 : 0;
      const wicketFactor = Math.max(0.1, 1 - currentWickets * 0.08);
      const ballsLeft = Math.max(0, totalBalls - currentBalls);
      const progress = currentBalls / totalBalls;

      if (inningsNo === 1) {
        // First Innings score projection
        const projectedRuns = currentRuns + (ballsLeft * (currentRr || 8) / 6) * wicketFactor;
        const mid = Math.max(currentRuns, Math.round(projectedRuns));
        const low = Math.max(currentRuns, Math.round(mid * 0.88));
        const high = Math.round(mid * 1.12);

        scorePrediction = {
          low,
          mid,
          high,
          rr: Math.round(currentRr * 100) / 100,
          projected: `${low}–${high}`,
        };

        // Live win probability for 1st innings based on runs & wickets
        // Base is 50/50. Average score is 85.
        const scoreAdvantage = (mid - 85) * 0.5;
        const wicketDisadvantage = currentWickets * 5;
        const rawBatting = 50 + scoreAdvantage - wicketDisadvantage;
        battingProb = Math.min(Math.max(Math.round(rawBatting), 10), 90);
        bowlingProb = 100 - battingProb;
        statusText = `1st Innings: ${activeInnings.batting_team_id === match.team1_id ? match.team1_name : match.team2_name} batting`;
      } else {
        // Second Innings chase prediction
        const target = activeInnings.target_runs || (completedInnings ? completedInnings.runs + 1 : 0);
        const runsNeeded = target - currentRuns;

        if (runsNeeded <= 0) {
          battingProb = 100;
          bowlingProb = 0;
          statusText = "Target successfully chased!";
        } else if (ballsLeft <= 0 || currentWickets >= 10) {
          battingProb = 0;
          bowlingProb = 100;
          statusText = "Innings complete";
        } else {
          const requiredRr = (runsNeeded / ballsLeft) * 6;
          const rrRatio = requiredRr > 0 ? currentRr / requiredRr : 1.5;
          const wicketPressure = Math.exp(-0.18 * currentWickets);
          const progressFactor = 1 + (ballsLeft / totalBalls) * 0.2;

          const rawProb = rrRatio * wicketPressure * progressFactor * 50;
          battingProb = Math.min(Math.max(Math.round(rawProb), 5), 95);
          bowlingProb = 100 - battingProb;

          if (requiredRr <= 4) {
            statusText = "Easy chase";
          } else if (requiredRr <= 7) {
            statusText = "Competitive chase";
          } else if (requiredRr <= 10) {
            statusText = "Tough chase";
          } else {
            statusText = "Very difficult chase";
          }
        }

        // Convert batting/bowling team to Team 1/Team 2
        const battingTeamId = activeInnings.batting_team_id;
        const isTeam1Batting = battingTeamId === match.team1_id;

        return {
          matchId,
          status: match.status,
          scorePrediction,
          winProbability: {
            team1: match.team1_name,
            team2: match.team2_name,
            team1_prob: isTeam1Batting ? battingProb : bowlingProb,
            team2_prob: isTeam1Batting ? bowlingProb : battingProb,
            status: statusText,
          },
        };
      }

      // Convert batting/bowling team to Team 1/Team 2 for 1st Innings
      const battingTeamId = activeInnings.batting_team_id;
      const isTeam1Batting = battingTeamId === match.team1_id;

      return {
        matchId,
        status: match.status,
        scorePrediction,
        winProbability: {
          team1: match.team1_name,
          team2: match.team2_name,
          team1_prob: isTeam1Batting ? battingProb : bowlingProb,
          team2_prob: isTeam1Batting ? bowlingProb : battingProb,
          status: statusText,
        },
      };
    }

    // Upcoming Match Winner Prediction using historical metrics
    // Let's query average runs and NRR for both teams
    const getStats = async (teamId: string) => {
      const res = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN batting_team_id = $1 THEN runs ELSE 0 END), 0)::int AS runs_scored,
           COALESCE(SUM(CASE WHEN batting_team_id = $1 THEN balls_bowled ELSE 0 END), 0)::int AS balls_faced,
           COALESCE(SUM(CASE WHEN bowling_team_id = $1 THEN runs ELSE 0 END), 0)::int AS runs_conceded,
           COALESCE(SUM(CASE WHEN bowling_team_id = $1 THEN balls_bowled ELSE 0 END), 0)::int AS balls_bowled
         FROM innings
         WHERE batting_team_id = $1 OR bowling_team_id = $1`,
        [teamId]
      );
      const row = res.rows[0];
      const runsScored = row.runs_scored;
      const ballsFaced = row.balls_faced;
      const runsConceded = row.runs_conceded;
      const ballsBowled = row.balls_bowled;

      const battingRr = ballsFaced > 0 ? (runsScored / ballsFaced) * 6 : 7.5; // default RR 7.5
      const bowlingRr = ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 7.5;

      return {
        avgScore: battingRr * totalBalls / 6,
        nrr: battingRr - bowlingRr,
      };
    };

    const [t1Stats, t2Stats] = await Promise.all([
      getStats(match.team1_id),
      getStats(match.team2_id),
    ]);

    const scoreDiff = t1Stats.avgScore - t2Stats.avgScore;
    const nrrDiff = t1Stats.nrr - t2Stats.nrr;
    const advantage = (scoreDiff * 0.6) + (nrrDiff * 10 * 0.4);

    const t1Prob = Math.min(Math.max(round(1 / (1 + Math.exp(-advantage / 15)) * 100), 15), 85);
    const t2Prob = 100 - t1Prob;

    const confidence = Math.abs(t1Prob - t2Prob) > 20
      ? "High Confidence"
      : Math.abs(t1Prob - t2Prob) > 10
      ? "Medium Confidence"
      : "Low Confidence";

    return {
      matchId,
      status: match.status,
      winProbability: {
        team1: match.team1_name,
        team2: match.team2_name,
        team1_prob: t1Prob,
        team2_prob: t2Prob,
        status: `Pre-match analysis (${confidence})`,
      },
    };
  },
};

function round(val: number): number {
  return Math.round(val);
}
