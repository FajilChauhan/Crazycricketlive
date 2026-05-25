import { Request, Response } from "express";
import { tournamentService } from "./tournament.service";
import { sendResponse } from "../../shared/utils/response";

export const tournamentController = {
  createTournament: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const tournament = await tournamentService.createTournament(userId, req.body);
    return sendResponse(res, 201, "Tournament created successfully", tournament);
  },

  getAllTournaments: async (req: Request, res: Response) => {
    const tournaments = await tournamentService.getAllTournaments();
    return sendResponse(res, 200, "Tournaments fetched successfully", tournaments);
  },

  getMyTournaments: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const tournaments = await tournamentService.getMyTournaments(userId);
    return sendResponse(res, 200, "My tournaments fetched successfully", tournaments);
  },

  getTournamentById: async (req: Request, res: Response) => {
    const { tournamentId } = req.params;
    const tournament = await tournamentService.getTournamentById(tournamentId);
    return sendResponse(res, 200, "Tournament details fetched successfully", tournament);
  },

  updateTournament: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { tournamentId } = req.params;
    const tournament = await tournamentService.updateTournament(tournamentId, userId, req.body);
    return sendResponse(res, 200, "Tournament updated successfully", tournament);
  },

  deleteTournament: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { tournamentId } = req.params;
    const result = await tournamentService.deleteTournament(tournamentId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};