import api from "./api";

export const profileService = {
  getMyProfile: async () => {
    const res = await api.get("/profile/me");
    return res.data.data;
  },

  updateMyProfile: async (data: {
    username?: string;
    profileImage?: string;
  }) => {
    const res = await api.put("/profile/me", data);
    return res.data.data;
  },

  getMyStats: async () => {
    const res = await api.get("/profile/me/stats");
    return res.data.data;
  },

  getMyTournaments: async () => {
    const res = await api.get("/profile/me/tournaments");
    return res.data.data;
  },

  getMyMatches: async () => {
    const res = await api.get("/profile/me/matches");
    return res.data.data;
  },
};