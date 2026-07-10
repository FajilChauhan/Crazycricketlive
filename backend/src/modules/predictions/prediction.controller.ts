import { Request, Response } from "express";
import { sendResponse } from "../../shared/utils/response";
import { predictionService } from "./prediction.service";
import { asyncHandler } from "../../shared/utils/asyncHandler";

export const predictionController = {
  predictMatch: asyncHandler(async (req: Request, res: Response) => {
    const matchId = req.params.matchId as string;
    const result = await predictionService.predictMatch(matchId);
    return sendResponse(res, 200, "Match predictions generated successfully", result);
  }),
};
