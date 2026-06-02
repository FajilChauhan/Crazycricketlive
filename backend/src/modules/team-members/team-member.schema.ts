import { z } from "zod";

const roleEnum = z.enum([
  "player",
  "captain",
  "vice_captain",
  "keeper",
  "all_rounder",
  "batsman",
  "bowler",
]);

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
  role: roleEnum.optional(),
  isCaptain: z.boolean().optional(),
  jerseyNumber: z.number().int().positive().optional(),
});

export const updateTeamMemberSchema = z.object({
  role: roleEnum.optional(),
  isCaptain: z.boolean().optional(),
  jerseyNumber: z.number().int().positive().optional(),
});