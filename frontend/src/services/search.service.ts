// services/search.service.ts
import api from "./api";

export const searchService = {
  searchAll: async (q: string) => {
    const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },

  searchUsers: async (q: string) => {
    const res = await api.get(`/search/users?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },

  searchTournaments: async (q: string) => {
    const res = await api.get(`/search/tournaments?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },

  searchTeams: async (q: string) => {
    const res = await api.get(`/search/teams?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },

  searchMatches: async (q: string) => {
    const res = await api.get(`/search/matches?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },
};