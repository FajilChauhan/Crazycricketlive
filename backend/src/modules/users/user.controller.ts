import { Request, Response } from "express";
import { userService } from "./user.service";
import { sendResponse } from "../../shared/utils/response";

export const userController = {
  getAllUsers: async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const search = req.query.search as string | undefined;

    const result = await userService.getAllUsers(page, limit, search);
    return sendResponse(res, 200, "Users fetched successfully", result);
  },

  getUserById: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const user = await userService.getUserById(userId);
    return sendResponse(res, 200, "User fetched successfully", user);
  },

  updateUser: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const user = await userService.updateUser(userId, req.body);
    return sendResponse(res, 200, "User updated successfully", user);
  },

  deleteUser: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await userService.deleteUser(userId);
    return sendResponse(res, 200, result.message, result);
  },

  getUsersByTeam: async (req: Request, res: Response) => {
    const teamId = req.params.teamId as string;
    const users = await userService.getUsersByTeam(teamId);
    return sendResponse(res, 200, "Team users fetched successfully", users);
  },

  getUsersByTournament: async (req: Request, res: Response) => {
    const tournamentId = req.params.tournamentId as string;
    const users = await userService.getUsersByTournament(tournamentId);
    return sendResponse(res, 200, "Tournament users fetched successfully", users);
  },

  getAvailableUsersForTournament: async (req: Request, res: Response) => {
    const tournamentId = req.params.tournamentId as string;
    const users = await userService.getAvailableUsersForTournament(tournamentId);
    return sendResponse(res, 200, "Available users fetched successfully", users);
  },
};
