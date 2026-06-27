import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { loginSchema, registerSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "./auth.schema";
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

router.post("/register", upload.single('profileImage'), handleFileUpload, validateBody(registerSchema), asyncHandler(authController.register));
router.post("/login", validateBody(loginSchema), asyncHandler(authController.login));
router.get("/me", authenticateToken, asyncHandler(authController.me));

router.post("/forgot-password", validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post("/verify-reset-code", validateBody(verifyResetCodeSchema), asyncHandler(authController.verifyResetCode));
router.post("/reset-password", validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;