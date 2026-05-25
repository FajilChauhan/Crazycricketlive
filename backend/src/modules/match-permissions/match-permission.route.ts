import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { grantPermissionSchema } from "./match-permission.schema";
import { matchPermissionController } from "./match-permission.controller";

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
  "/:matchId/permissions",
  authenticateToken,
  validateBody(grantPermissionSchema),
  asyncHandler(matchPermissionController.grantPermission)
);

router.get(
  "/:matchId/permissions",
  authenticateToken,
  asyncHandler(matchPermissionController.listPermissions)
);

router.get(
  "/:matchId/permissions/check",
  authenticateToken,
  asyncHandler(matchPermissionController.checkCurrentUserPermission)
);

router.delete(
  "/:matchId/permissions/:permissionId",
  authenticateToken,
  asyncHandler(matchPermissionController.revokePermission)
);

export default router;