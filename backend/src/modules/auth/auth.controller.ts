import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendResponse } from "../../shared/utils/response";

export const authController = {
  register: async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return sendResponse(res, 201, "User registered successfully", result);
  },

  login: async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return sendResponse(res, 200, "Login successful", result);
  },

  me: async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const user = await authService.getMe(userId);
    return sendResponse(res, 200, "User profile fetched successfully", user);
  },
};