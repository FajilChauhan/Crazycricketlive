import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { matchPermissionService } from "./match-permission.service";

export const matchPermissionController = {
  grantPermission: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { matchId } = req.params;
    const result = await matchPermissionService.grantPermission(matchId, userId, req.body);
    return sendResponse(res, 201, "Permission granted successfully", result);
  },

  listPermissions: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { matchId } = req.params;
    const result = await matchPermissionService.listPermissions(matchId, userId);
    return sendResponse(res, 200, "Permissions fetched successfully", result);
  },

  checkCurrentUserPermission: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { matchId } = req.params;
    const result = await matchPermissionService.checkCurrentUserPermission(matchId, userId);
    return sendResponse(res, 200, "Permission check completed", result);
  },

  revokePermission: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { matchId, permissionId } = req.params;
    const result = await matchPermissionService.revokePermission(matchId, permissionId, userId);
    return sendResponse(res, 200, result.message, result);
  },
};