import { z } from "zod";

export const createMatchSchema = z.object({
  tournamentId: z.string().uuid(),
  team1Id: z.string().uuid(),
  team2Id: z.string().uuid(),
  groundName: z.string().min(2),
  matchType: z.string().optional(),
  overs: z.number().int().positive(),
  matchNo: z.number().int().positive(),
  scheduledStartAt: z.string().optional(),
});

export const updateMatchSchema = z.object({
  groundName: z.string().min(2).optional(),
  matchType: z.string().optional(),
  overs: z.number().int().positive().optional(),
  matchNo: z.number().int().positive().optional(),
  scheduledStartAt: z.string().optional(),
  status: z.enum(["upcoming", "live", "completed", "abandoned", "cancelled"]).optional(),
});

export const tossSchema = z.object({
  tossWinnerTeamId: z.string().uuid(),
  tossDecision: z.enum(["bat", "bowl"]),
});

export const statusSchema = z.object({
  status: z.enum(["upcoming", "live", "completed", "abandoned", "cancelled"]),
});

export const addPlayingXISchema = z.object({
  teamId: z.string().uuid(),
  playerIds: z.array(z.string().uuid()).min(1),
});

export const startInningsSchema = z.object({
  inningsNo: z.number().int().positive(),
  battingTeamId: z.string().uuid(),
  bowlingTeamId: z.string().uuid(),
  targetRuns: z.number().int().nonnegative().optional(),
});

export const addBallSchema = z.object({
  inningsId: z.string().uuid(),
  overNumber: z.number().int().positive(),
  ballInOver: z.number().int().min(1).max(6),
  strikerId: z.string().uuid().optional(),
  nonStrikerId: z.string().uuid().optional(),
  bowlerId: z.string().uuid().optional(),
  runsScored: z.number().int().nonnegative(),
  extraRuns: z.number().int().nonnegative().optional(),
  extraType: z.enum(["wide", "no_ball", "bye", "leg_bye", "penalty"]).optional(),
  isLegalDelivery: z.boolean().optional(),
  isWicket: z.boolean().optional(),
  wicketType: z.string().optional(),
  commentary: z.string().optional(),
});