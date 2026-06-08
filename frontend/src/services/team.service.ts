// services/team.service.ts
import api from "./api";

export const teamService = {
  create: async (body: {
    tournamentId: string;
    teamName: string;
    teamLogo?: string;
  }) => {
    const res = await api.post("/teams", body);
    return res.data.data;
  },

  getById: async (teamId: string) => {
    const res = await api.get(`/teams/${teamId}`);
    return res.data.data;
  },

  // ✅ correct endpoint — /teams/my
  getMyTeams: async () => {
    const res = await api.get("/teams/my");
    return res.data.data;
  },

  update: async (teamId: string, body: {
    teamName?: string;
    teamLogo?: string;
  }) => {
    const res = await api.put(`/teams/${teamId}`, body);
    return res.data.data;
  },

  delete: async (teamId: string) => {
    const res = await api.delete(`/teams/${teamId}`);
    return res.data.data;
  },
};