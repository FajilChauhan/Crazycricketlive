// features/match/match.types.ts

export type MatchMode = "1v1" | "team";

export interface CreateMatchBody {
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  groundName: string;
  matchType: string;
  overs: number;
  matchNo: number;
  matchMode: MatchMode;
  scheduledStartAt?: string;
}

export interface Match {
  match_id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  ground_name: string;
  match_type: string;
  overs: number;
  match_no: number;
  status: string;
  match_mode?: MatchMode;
  toss_winner_team_id: string | null;
  toss_decision: "bat" | "bowl" | null;
  first_batting_team_id: string | null;
  winner_team_id: string | null;
  winner_team_name: string | null;
  scheduled_start_at: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface Innings {
  innings_id: string;
  match_id: string;
  innings_no: number;
  batting_team_id: string;
  bowling_team_id: string;
  batting_team_name: string;
  bowling_team_name: string;
  runs: number;
  wickets: number;
  balls_bowled: number;
  extras: number;
  fours: number;
  sixes: number;
  is_completed: boolean;
  target_runs: number | null;
}

export interface Ball {
  ball_by_ball_id: string;
  innings_id: string;
  over_number: number;
  ball_in_over: number;
  runs_scored: number;
  extra_runs: number;
  extra_type: string | null;
  is_wicket: boolean;
  wicket_type: string | null;
  is_legal_delivery: boolean;
}