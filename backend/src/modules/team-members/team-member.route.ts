import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { teamMemberController } from "./team-member.controller";
import { addTeamMemberSchema, updateTeamMemberSchema } from "./team-member.schema";

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
  "/:teamId/members",
  authenticateToken,
  validateBody(addTeamMemberSchema),
  asyncHandler(teamMemberController.addTeamMember)
);

router.get(
  "/:teamId/members",
  authenticateToken,
  asyncHandler(teamMemberController.getTeamMembers)
);

router.get(
  "/:teamId/members/:userId",
  authenticateToken,
  asyncHandler(teamMemberController.getTeamMemberByUserId)
);

router.put(
  "/:teamId/members/:userId",
  authenticateToken,
  validateBody(updateTeamMemberSchema),
  asyncHandler(teamMemberController.updateTeamMember)
);

router.delete(
  "/:teamId/members/:userId",
  authenticateToken,
  asyncHandler(teamMemberController.deleteTeamMember)
);

export default router;