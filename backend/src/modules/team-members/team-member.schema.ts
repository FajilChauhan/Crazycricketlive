import { z } from "zod";

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
  role: z.enum(["player", "captain", "vice_captain", "keeper", "all_rounder", "batsman", "bowler"]).optional(),
  isCaptain: z.boolean().optional(),
  jerseyNumber: z.number().int().positive().optional(),
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(["player", "captain", "vice_captain", "keeper", "all_rounder", "batsman", "bowler"]).optional(),
  isCaptain: z.boolean().optional(),
  jerseyNumber: z.number().int().positive().optional(),
});