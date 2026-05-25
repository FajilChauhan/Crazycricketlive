import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { pointService } from "./point.service";

export const pointController = {
  refreshPointsTable: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { tournamentId } = req.params;
    const result = await pointService.refreshPointsTable(tournamentId, userId);
    return sendResponse(res, 200, result.message, result);
  },

  getPointsTable: async (req: Request, res: Response) => {
    const { tournamentId } = req.params;
    const result = await pointService.getPointsTable(tournamentId);
    return sendResponse(res, 200, "Points table fetched successfully", result);
  },

  getTeamStanding: async (req: Request, res: Response) => {
    const { tournamentId, teamId } = req.params;
    const result = await pointService.getTeamStanding(tournamentId, teamId);
    return sendResponse(res, 200, "Team standing fetched successfully", result);
  },

  resetPointsTable: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { tournamentId } = req.params;
    const result = await pointService.resetPointsTable(tournamentId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};