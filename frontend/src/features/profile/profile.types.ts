// features/profile/profile.types.ts
export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  profileImage: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UserStats {
  totalMatches: number;
  totalRuns: number;
  totalWickets: number;
  createdTournaments: number;
  createdTeams: number;
}

export interface UserTournament {
  tournament_id: string;
  tournament_name: string;
  organization_name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface UserTeam {
  team_id: string;
  team_name: string;
  team_logo: string | null;
  tournament_id: string;
  tournament_name: string;
  created_at: string;
}

export interface UserMatch {
  match_id: string;
  status: string;
  ground_name: string;
  match_type: string;
  overs: number;
  match_no: number;
  team1_name: string;
  team2_name: string;
  created_at: string;
}