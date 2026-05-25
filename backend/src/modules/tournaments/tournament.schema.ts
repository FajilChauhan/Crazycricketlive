import { z } from "zod";

export const createTournamentSchema = z.object({
  tournamentName: z.string().min(3, "Tournament name must be at least 3 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

export const updateTournamentSchema = z.object({
  tournamentName: z.string().min(3).optional(),
  organizationName: z.string().min(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});