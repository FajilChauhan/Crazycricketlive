import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  getSummary: async (req: Request, res: Response) => {
    const result = await dashboardService.getSummary();
    return sendResponse(res, 200, "Dashboard summary fetched successfully", result);
  },

  getLiveMatches: async (req: Request, res: Response) => {
    const result = await dashboardService.getLiveMatches();
    return sendResponse(res, 200, "Live matches fetched successfully", result);
  },

  getUpcomingMatches: async (req: Request, res: Response) => {
    const result = await dashboardService.getUpcomingMatches();
    return sendResponse(res, 200, "Upcoming matches fetched successfully", result);
  },

  getRecentTournaments: async (req: Request, res: Response) => {
    const result = await dashboardService.getRecentTournaments();
    return sendResponse(res, 200, "Recent tournaments fetched successfully", result);
  },

  getTopTeams: async (req: Request, res: Response) => {
    const result = await dashboardService.getTopTeams();
    return sendResponse(res, 200, "Top teams fetched successfully", result);
  },

  getTopPlayers: async (req: Request, res: Response) => {
    const result = await dashboardService.getTopPlayers();
    return sendResponse(res, 200, "Top players fetched successfully", result);
  },
};