import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  profileImage: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});