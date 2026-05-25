import { Router } from "express";
import { teamController } from "./team.controller";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { createTeamSchema, updateTeamSchema } from "./team.schema";

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

router.post(
  "/",
  authenticateToken,
  validateBody(createTeamSchema),
  asyncHandler(teamController.createTeam)
);

router.get("/my", authenticateToken, asyncHandler(teamController.getMyTeams));

router.get(
  "/:teamId",
  authenticateToken,
  asyncHandler(teamController.getTeamById)
);

router.put(
  "/:teamId",
  authenticateToken,
  validateBody(updateTeamSchema),
  asyncHandler(teamController.updateTeam)
);

router.delete(
  "/:teamId",
  authenticateToken,
  asyncHandler(teamController.deleteTeam)
);

export default router;