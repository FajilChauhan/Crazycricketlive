import { z } from "zod";

export const updateUserSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").optional(),
  profileImage: z.string().url("Invalid profile image URL").optional(),
});

export const getAllUsersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});
