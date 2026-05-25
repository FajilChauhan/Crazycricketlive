export interface AddTeamMemberBody {
  userId: string;
  role?: "player" | "captain" | "vice_captain" | "keeper" | "all_rounder" | "batsman" | "bowler";
  isCaptain?: boolean;
  jerseyNumber?: number;
}

export interface UpdateTeamMemberBody {
  role?: "player" | "captain" | "vice_captain" | "keeper" | "all_rounder" | "batsman" | "bowler";
  isCaptain?: boolean;
  jerseyNumber?: number;
}