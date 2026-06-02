import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { teamMemberService } from "./team-member.service";

export const teamMemberController = {
  addTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId } = req.params;
    const result = await teamMemberService.addTeamMember(teamId, ownerUserId, req.body);
    return sendResponse(res, 201, "Player added to team successfully", result);
  },

  getTeamMembers: async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const result = await teamMemberService.getTeamMembers(teamId);
    return sendResponse(res, 200, "Team members fetched successfully", result);
  },

  getTeamMemberByUserId: async (req: Request, res: Response) => {
    const { teamId, userId } = req.params;
    const result = await teamMemberService.getTeamMemberByUserId(teamId, userId);
    return sendResponse(res, 200, "Team member fetched successfully", result);
  },

  updateTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId, userId } = req.params;
    const result = await teamMemberService.updateTeamMember(teamId, ownerUserId, userId, req.body);
    return sendResponse(res, 200, "Team member updated successfully", result);
  },

  deleteTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId, userId } = req.params;
    const result = await teamMemberService.deleteTeamMember(teamId, ownerUserId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};