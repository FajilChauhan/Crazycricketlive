export interface CreateMatchBody {
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  groundName: string;
  matchType?: string;
  overs: number;
  matchNo: number;
  scheduledStartAt?: string;
}

export interface UpdateMatchBody {
  groundName?: string;
  matchType?: string;
  overs?: number;
  matchNo?: number;
  scheduledStartAt?: string;
  status?: "upcoming" | "live" | "completed" | "abandoned" | "cancelled";
}

export interface TossBody {
  tossWinnerTeamId: string;
  tossDecision: "bat" | "bowl";
}

export interface StatusBody {
  status: "upcoming" | "live" | "completed" | "abandoned" | "cancelled";
}

export interface AddPlayingXIBody {
  teamId: string;
  playerIds: string[];
}

export interface StartInningsBody {
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  targetRuns?: number;
}

export interface AddBallBody {
  inningsId: string;
  overNumber: number;
  ballInOver: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  runsScored: number;
  extraRuns?: number;
  extraType?: "wide" | "no_ball" | "bye" | "leg_bye" | "penalty";
  isLegalDelivery?: boolean;
  isWicket?: boolean;
  wicketType?: string;
  commentary?: string;
}