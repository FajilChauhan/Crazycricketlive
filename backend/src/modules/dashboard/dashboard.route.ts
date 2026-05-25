import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get("/summary", authenticateToken, asyncHandler(dashboardController.getSummary));
router.get("/live-matches", authenticateToken, asyncHandler(dashboardController.getLiveMatches));
router.get("/upcoming-matches", authenticateToken, asyncHandler(dashboardController.getUpcomingMatches));
router.get("/recent-tournaments", authenticateToken, asyncHandler(dashboardController.getRecentTournaments));
router.get("/top-teams", authenticateToken, asyncHandler(dashboardController.getTopTeams));
router.get("/top-players", authenticateToken, asyncHandler(dashboardController.getTopPlayers));

export default router;