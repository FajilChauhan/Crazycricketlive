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
 
  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data.data;
  },
 
  verifyResetCode: async (email: string, code: string) => {
    const res = await api.post("/auth/verify-reset-code", { email, code });
    return res.data.data;
  },
 
  resetPassword: async (data: any) => {
    const res = await api.post("/auth/reset-password", data);
    return res.data.data;
  },
};