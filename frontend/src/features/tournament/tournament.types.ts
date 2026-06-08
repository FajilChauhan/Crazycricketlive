// features/tournament/tournament.types.ts

export interface Tournament {
  tournament_id: string;
  tournament_name: string;
  organization_name: string;
  created_by_user_id: string;
  created_by_username: string;
  status: "draft" | "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  team_id: string;
  tournament_id: string;
  team_name: string;
  team_logo: string | null;
  created_by_user_id: string;
  created_at: string;
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
  toss_winner_team_id: string | null;
  toss_decision: "bat" | "bowl" | null;
  first_batting_team_id: string | null;
  winner_team_id: string | null;
  winner_team_name: string | null;
  scheduled_start_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface PointsRow {
  points_table_id: string;
  team_id: string;
  team_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  no_results: number;
  points: number;
  net_run_rate: number;
}

export interface TournamentDetail {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  pointsTable: PointsRow[];
}

export interface CreateTournamentBody {
  tournamentName: string;
  organizationName: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface UpdateTournamentBody {
  tournamentName?: string;
  organizationName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}