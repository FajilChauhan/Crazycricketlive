import { Request, Response } from "express";
import { teamService } from "./team.service";
import { sendResponse } from "../../shared/utils/response";

export const teamController = {
  createTeam: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const team = await teamService.createTeam(userId, req.body);
    return sendResponse(res, 201, "Team created successfully", team);
  },

  getTeamById: async (req: Request, res: Response) => {
    const teamId = req.params.teamId as string;
    const team = await teamService.getTeamById(teamId);
    return sendResponse(res, 200, "Team details fetched successfully", team);
  },

  getTeamsByTournament: async (req: Request, res: Response) => {
    const tournamentId = req.params.tournamentId as string;
    const teams = await teamService.getTeamsByTournament(tournamentId);
    return sendResponse(res, 200, "Tournament teams fetched successfully", teams);
  },

  getMyTeams: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const teams = await teamService.getMyTeams(userId);
    return sendResponse(res, 200, "My teams fetched successfully", teams);
  },

  updateTeam: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const teamId = req.params.teamId as string;
    const team = await teamService.updateTeam(teamId, userId, req.body);
    return sendResponse(res, 200, "Team updated successfully", team);
  },

  deleteTeam: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const teamId = req.params.teamId as string;
    const result = await teamService.deleteTeam(teamId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};