import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { pointController } from "./point.controller";

const router = Router();

router.post(
  "/:tournamentId/points/refresh",
  authenticateToken,
  asyncHandler(pointController.refreshPointsTable)
);

router.get(
  "/:tournamentId/points",
  authenticateToken,
  asyncHandler(pointController.getPointsTable)
);

router.get(
  "/:tournamentId/points/:teamId",
  authenticateToken,
  asyncHandler(pointController.getTeamStanding)
);

router.delete(
  "/:tournamentId/points/reset",
  authenticateToken,
  asyncHandler(pointController.resetPointsTable)
);

export default router;