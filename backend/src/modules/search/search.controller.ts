import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { searchService } from "./search.service";

export const searchController = {
  searchAll: async (req: Request, res: Response) => {
    const q = String(req.query.q || "");
    const result = await searchService.searchAll(q);
    return sendResponse(res, 200, "Search results fetched successfully", result);
  },

  searchUsers: async (req: Request, res: Response) => {
    const q = String(req.query.q || "");
    const result = await searchService.searchUsers(q);
    return sendResponse(res, 200, "Users search fetched successfully", result);
  },

  searchTournaments: async (req: Request, res: Response) => {
    const q = String(req.query.q || "");
    const result = await searchService.searchTournaments(q);
    return sendResponse(res, 200, "Tournaments search fetched successfully", result);
  },

  searchTeams: async (req: Request, res: Response) => {
    const q = String(req.query.q || "");
    const result = await searchService.searchTeams(q);
    return sendResponse(res, 200, "Teams search fetched successfully", result);
  },

  searchMatches: async (req: Request, res: Response) => {
    const q = String(req.query.q || "");
    const result = await searchService.searchMatches(q);
    return sendResponse(res, 200, "Matches search fetched successfully", result);
  },
};