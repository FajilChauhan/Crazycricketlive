import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { loginSchema, registerSchema } from "./auth.schema";

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

router.post("/register", validateBody(registerSchema), asyncHandler(authController.register));
router.post("/login", validateBody(loginSchema), asyncHandler(authController.login));
router.get("/me", authenticateToken, asyncHandler(authController.me));

export default router;