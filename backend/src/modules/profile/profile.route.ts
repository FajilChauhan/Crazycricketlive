import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { profileController } from "./profile.controller";
import { updateProfileSchema } from "./profile.schema";

const router = Router();

const validateBody =
  (schema: any) =>
  (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };

router.get(
  "/me",
  authenticateToken,
  asyncHandler(profileController.getMyProfile)
);

router.put(
  "/me",
  authenticateToken,
  validateBody(updateProfileSchema),
  asyncHandler(profileController.updateMyProfile)
);

router.get(
  "/me/stats",
  authenticateToken,
  asyncHandler(profileController.getMyStats)
);

router.get(
  "/me/tournaments",
  authenticateToken,
  asyncHandler(profileController.getMyTournaments)
);

router.get(
  "/me/teams",
  authenticateToken,
  asyncHandler(profileController.getMyTeams)
);

router.get(
  "/me/matches",
  authenticateToken,
  asyncHandler(profileController.getMyMatches)
);

router.get(
  "/me/live-matches",
  authenticateToken,
  asyncHandler(profileController.getMyLiveMatches)
);

/* PUBLIC PROFILE ROUTES BELOW */

router.get(
  "/:userId",
  asyncHandler(profileController.getProfileById)
);

router.get(
  "/:userId/tournaments",
  asyncHandler(profileController.getUserTournaments)
);

router.get(
  "/:userId/teams",
  asyncHandler(profileController.getUserTeams)
);

router.get(
  "/:userId/matches",
  asyncHandler(profileController.getUserMatches)
);

router.get(
  "/:userId/live-matches",
  asyncHandler(profileController.getUserLiveMatches)
);

router.get(
  "/:userId/stats",
  asyncHandler(profileController.getUserStats)
);

export default router;