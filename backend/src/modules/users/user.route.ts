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

router.get("/", authenticateToken, asyncHandler(userController.getAllUsers));
router.get("/available/tournament/:tournamentId", authenticateToken, asyncHandler(userController.getAvailableUsersForTournament));
router.get("/:userId", authenticateToken, asyncHandler(userController.getUserById));
router.put("/:userId", authenticateToken, validateBody(updateUserSchema), asyncHandler(userController.updateUser));
router.delete("/:userId", authenticateToken, asyncHandler(userController.deleteUser));

router.get("/team/:teamId", authenticateToken, asyncHandler(userController.getUsersByTeam));
router.get("/tournament/:tournamentId", authenticateToken, asyncHandler(userController.getUsersByTournament));

export default router;
