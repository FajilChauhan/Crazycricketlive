import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { profileService } from "./profile.service";

export const profileController = {
  getMyProfile: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await profileService.getMyProfile(userId);
    return sendResponse(res, 200, "Profile fetched successfully", result);
  },

  updateMyProfile: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await profileService.updateMyProfile(userId, req.body);
    return sendResponse(res, 200, "Profile updated successfully", result);
  },

  getProfileById: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getProfileById(userId);
    return sendResponse(res, 200, "Profile fetched successfully", result);
  },

  getUserTournaments: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getUserTournaments(userId);
    return sendResponse(res, 200, "User tournaments fetched successfully", result);
  },

  getUserTeams: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getUserTeams(userId);
    return sendResponse(res, 200, "User teams fetched successfully", result);
  },

  getUserMatches: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getUserMatches(userId);
    return sendResponse(res, 200, "User matches fetched successfully", result);
  },

  getUserLiveMatches: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getUserLiveMatches(userId);
    return sendResponse(res, 200, "User live matches fetched successfully", result);
  },

  getUserStats: async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const result = await profileService.getUserStats(userId);
    return sendResponse(res, 200, "User stats fetched successfully", result);
  },
  getMyStats: async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result =
    await profileService.getUserStats(userId);

  return sendResponse(
    res,
    200,
    "My stats fetched successfully",
    result
  );
},
getMyTournaments: async (
  req: Request,
  res: Response
) => {
  const userId = (req as any).user.userId;

  const result =
    await profileService.getUserTournaments(userId);

  return sendResponse(
    res,
    200,
    "My tournaments fetched successfully",
    result
  );
},getMyTeams: async (
  req: Request,
  res: Response
) => {
  const userId = (req as any).user.userId;

  const result =
    await profileService.getUserTeams(userId);

  return sendResponse(
    res,
    200,
    "My teams fetched successfully",
    result
  );
},getMyMatches: async (
  req: Request,
  res: Response
) => {
  const userId = (req as any).user.userId;

  const result =
    await profileService.getUserMatches(userId);

  return sendResponse(
    res,
    200,
    "My matches fetched successfully",
    result
  );
},getMyLiveMatches: async (
  req: Request,
  res: Response
) => {
  const userId = (req as any).user.userId;

  const result =
    await profileService.getUserLiveMatches(userId);

  return sendResponse(
    res,
    200,
    "My live matches fetched successfully",
    result
  );
},
};