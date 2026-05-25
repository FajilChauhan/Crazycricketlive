export interface CreateTeamBody {
  tournamentId: string;
  teamName: string;
  teamLogo?: string;
}

export interface UpdateTeamBody {
  teamName?: string;
  teamLogo?: string;
}