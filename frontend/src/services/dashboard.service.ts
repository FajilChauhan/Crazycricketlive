// services/dashboard.service.ts
import api from "./api";

export const dashboardService = {
  getSummary: async () => {
    const res = await api.get("/dashboard/summary");
    return res.data.data;
  },

  getLiveMatches: async () => {
    const res = await api.get("/dashboard/live-matches");
    return res.data.data;
  },

  getUpcomingMatches: async () => {
    const res = await api.get("/dashboard/upcoming-matches");
    return res.data.data;
  },

  getRecentTournaments: async () => {
    const res = await api.get("/dashboard/recent-tournaments");
    return res.data.data;
  },

  getTopTeams: async () => {
    const res = await api.get("/dashboard/top-teams");
    return res.data.data;
  },

  getTopPlayers: async () => {
    const res = await api.get("/dashboard/top-players");
    return res.data.data;
  },
};