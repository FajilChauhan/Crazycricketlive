import { z } from "zod";

export const createTeamSchema = z.object({
  tournamentId: z.string().uuid("Invalid tournamentId"),
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
  teamLogo: z.string().url().optional(),
});

export const updateTeamSchema = z.object({
  teamName: z.string().min(2, "Team name must be at least 2 characters").optional(),
  teamLogo: z.string().url().optional(),
});