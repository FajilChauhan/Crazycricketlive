// services/user.service.ts
import api from "./api";

export const userService = {
  getAllUsers: async () => {
    const res = await api.get("/users");
    return res.data.data.users; // ✅ unwrap .users array
  },

  getAvailableUsersForTournament: async (tournamentId: string) => {
    const res = await api.get(`/users/available/tournament/${tournamentId}`);
    return res.data.data; // ✅ returns array of users
  },

  getUserById: async (userId: string) => {
    const res = await api.get(`/users/${userId}`);
    return res.data.data;
  },
};