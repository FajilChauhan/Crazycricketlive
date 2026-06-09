import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get("/summary", asyncHandler(dashboardController.getSummary));
router.get("/live-matches", asyncHandler(dashboardController.getLiveMatches));
router.get("/upcoming-matches", asyncHandler(dashboardController.getUpcomingMatches));
router.get("/recent-tournaments", asyncHandler(dashboardController.getRecentTournaments));
router.get("/top-teams", asyncHandler(dashboardController.getTopTeams));
router.get("/top-players", asyncHandler(dashboardController.getTopPlayers));

export default router;