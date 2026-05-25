import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { searchController } from "./search.controller";

const router = Router();

router.get("/", authenticateToken, asyncHandler(searchController.searchAll));
router.get("/users", authenticateToken, asyncHandler(searchController.searchUsers));
router.get("/tournaments", authenticateToken, asyncHandler(searchController.searchTournaments));
router.get("/teams", authenticateToken, asyncHandler(searchController.searchTeams));
router.get("/matches", authenticateToken, asyncHandler(searchController.searchMatches));

export default router;