import { Router } from "express";
import { userController } from "./user.controller";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { updateUserSchema } from "./user.schema";

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

router.get("/", asyncHandler(userController.getAllUsers));
router.get("/available/tournament/:tournamentId", asyncHandler(userController.getAvailableUsersForTournament));
router.get("/:userId", asyncHandler(userController.getUserById));

export default router;
