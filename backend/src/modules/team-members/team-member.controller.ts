import { Request, Response } from "express";
import { teamMemberService } from "./team-member.service";
import { sendResponse } from "../../shared/utils/response";

export const teamMemberController = {
  addTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId } = req.params;
    const member = await teamMemberService.addTeamMember(teamId, ownerUserId, req.body);
    return sendResponse(res, 201, "Player added to team successfully", member);
  },

  getTeamMembers: async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const members = await teamMemberService.getTeamMembers(teamId);
    return sendResponse(res, 200, "Team members fetched successfully", members);
  },

  getTeamMemberByUserId: async (req: Request, res: Response) => {
    const { teamId, userId } = req.params;
    const member = await teamMemberService.getTeamMemberByUserId(teamId, userId);
    return sendResponse(res, 200, "Team member fetched successfully", member);
  },

  updateTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId, userId } = req.params;
    const member = await teamMemberService.updateTeamMember(teamId, ownerUserId, userId, req.body);
    return sendResponse(res, 200, "Team member updated successfully", member);
  },

  deleteTeamMember: async (req: Request, res: Response) => {
    const ownerUserId = (req as any).user?.userId;
    const { teamId, userId } = req.params;
    const result = await teamMemberService.deleteTeamMember(teamId, ownerUserId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};