import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { profileController } from "./profile.controller";
import { updateProfileSchema } from "./profile.schema";
import { upload } from "../../middlewares/upload.middleware";

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

const handleFileUpload = (req: any, res: any, next: any) => {
  if (req.file) {
    req.body.profileImage = `/api/uploads/${req.file.filename}`;
  }
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
  upload.single('profileImage'),
  handleFileUpload,
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
  "/me/matches",
  authenticateToken,
  asyncHandler(profileController.getMyMatches)
);

export default router;