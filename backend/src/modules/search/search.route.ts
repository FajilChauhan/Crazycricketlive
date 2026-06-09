import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { searchController } from "./search.controller";

const router = Router();

router.get("/", asyncHandler(searchController.searchAll));
router.get("/users", asyncHandler(searchController.searchUsers));
router.get("/tournaments", asyncHandler(searchController.searchTournaments));
router.get("/teams", asyncHandler(searchController.searchTeams));
router.get("/matches", asyncHandler(searchController.searchMatches));

export default router;