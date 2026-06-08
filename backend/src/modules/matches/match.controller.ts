import { Request, Response } from "express";
import { matchService } from "./match.service";
import { sendResponse } from "../../shared/utils/response";

export const matchController = {
  createMatch: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const match = await matchService.createMatch(userId, req.body);
    return sendResponse(res, 201, "Match created successfully", match);
  },

  getMatchesByTournament: async (req: Request, res: Response) => {
    const tournamentId = req.params.tournamentId as string;
    const matches = await matchService.getMatchesByTournament(tournamentId);
    return sendResponse(res, 200, "Matches fetched successfully", matches);
  },

  getMatchById: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const match = await matchService.getMatchById(matchId);
    return sendResponse(res, 200, "Match fetched successfully", match);
  },

  updateMatch: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const match = await matchService.updateMatch(matchId, userId, req.body);
    return sendResponse(res, 200, "Match updated successfully", match);
  },

  deleteMatch: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const result = await matchService.deleteMatch(matchId, userId);
    return sendResponse(res, 200, result.message, result);
  },

  updateToss: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const match = await matchService.updateToss(matchId, userId, req.body);
    return sendResponse(res, 200, "Toss updated successfully", match);
  },

  updateStatus: async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const matchId = req.params.matchId as string;
  const match = await matchService.updateStatus(matchId, userId, req.body);
  return sendResponse(res, 200, "Match status updated successfully", match);
},

  addPlayingXI: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const result = await matchService.addPlayingXI(matchId, userId, req.body);
    return sendResponse(res, 200, result.message, result);
  },

  getPlayingXI: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getPlayingXI(matchId);
    return sendResponse(res, 200, "Playing XI fetched successfully", result);
  },

  startInnings: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const result = await matchService.startInnings(matchId, userId, req.body);
    return sendResponse(res, 201, "Innings started successfully", result);
  },

  endInnings: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const inningsId = req.params.inningsId as string;
    const result = await matchService.endInnings(matchId, userId, inningsId);
    return sendResponse(res, 200, "Innings ended successfully", result);
  },

  getInnings: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getInnings(matchId);
    return sendResponse(res, 200, "Innings fetched successfully", result);
  },

  addBall: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const matchId = req.params.matchId as string;
    const result = await matchService.addBall(matchId, userId, req.body);
    return sendResponse(res, 201, "Ball added successfully", result);
  },

  getBalls: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getBalls(matchId);
    return sendResponse(res, 200, "Balls fetched successfully", result);
  },

  getLiveScore: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getLiveScore(matchId);
    return sendResponse(res, 200, "Live score fetched successfully", result);
  },

  getScorecard: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getScorecard(matchId);
    return sendResponse(res, 200, "Scorecard fetched successfully", result);
  },

  getBattingScorecard: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const inningsId = req.query.inningsId as string | undefined;
    const result = await matchService.getBattingScorecard(matchId, inningsId);
    return sendResponse(res, 200, "Batting scorecard fetched successfully", result);
  },

  getBowlingScorecard: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const inningsId = req.query.inningsId as string | undefined;
    const result = await matchService.getBowlingScorecard(matchId, inningsId);
    return sendResponse(res, 200, "Bowling scorecard fetched successfully", result);
  },

  getSummary: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getSummary(matchId);
    return sendResponse(res, 200, "Match summary fetched successfully", result);
  },

  getPlayerStatus: async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await matchService.getPlayerStatus(matchId);
    return sendResponse(res, 200, "Player status fetched successfully", result);
  },

  getPlayerHistory: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await matchService.getPlayerHistory(userId);
    return sendResponse(res, 200, "Player history fetched successfully", result);
  },

  getPlayerStats: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await matchService.getPlayerStats(userId);
    return sendResponse(res, 200, "Player stats fetched successfully", result);
  },
  declareWinner: async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const matchId = req.params.matchId as string;
  const result = await matchService.declareWinner(matchId, userId, req.body);
  return sendResponse(res, 200, "Winner declared", result);
},

declareTie: async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const matchId = req.params.matchId as string;
  const result = await matchService.declareTie(matchId, userId);
  return sendResponse(res, 200, "Match declared tie", result);
},

getScoringState: async (req: Request, res: Response) => {
  const matchId = req.params.matchId as string;
  const state = await matchService.getScoringState(matchId);
  return sendResponse(res, 200, "Scoring state fetched successfully", { state });
},

saveScoringState: async (req: Request, res: Response) => {
  const matchId = req.params.matchId as string;
  const userId = (req as any).user?.userId as string;
  const state = await matchService.saveScoringState(matchId, userId, req.body);
  return sendResponse(res, 200, "Scoring state saved successfully", { state });
},

clearScoringState: async (req: Request, res: Response) => {
  const matchId = req.params.matchId as string;
  const userId = (req as any).user?.userId as string;
  await matchService.clearScoringState(matchId, userId);
  return sendResponse(res, 200, "Scoring state cleared successfully", null);
},
};