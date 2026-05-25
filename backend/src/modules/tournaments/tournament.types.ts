export interface CreateTournamentBody {
  tournamentName: string;
  organizationName: string;
  startDate?: string;
  endDate?: string;
  status?: "draft" | "active" | "completed" | "archived";
}

export interface UpdateTournamentBody {
  tournamentName?: string;
  organizationName?: string;
  startDate?: string;
  endDate?: string;
  status?: "draft" | "active" | "completed" | "archived";
}