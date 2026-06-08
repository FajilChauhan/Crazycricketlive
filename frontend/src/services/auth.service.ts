// services/auth.service.ts
import api from "./api";

export const authService = {
  login: async (data: { email: string; password: string }) => {
    const res = await api.post("/auth/login", data);
    return res.data.data; // ← unwrap the data object
  },

  signup: async (data: { username: string; email: string; password: string }) => {
    const res = await api.post("/auth/register", data);
    return res.data.data; // ← same here
  },

  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data.data; // ← and here
  },
};