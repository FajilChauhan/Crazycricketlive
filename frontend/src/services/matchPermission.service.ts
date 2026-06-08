// services/matchPermission.service.ts
import api from "./api";

export const matchPermissionService = {
  grant: async (matchId: string, body: {
    userId: string;
    permissionType: "score_update" | "match_admin";
  }) => {
    const res = await api.post(`/matches/${matchId}/permissions`, body);
    return res.data.data;
  },

  list: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/permissions`);
    return res.data.data;
  },

  // ✅ correct endpoint — /check not /me
  checkMyPermission: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/permissions/check`);
    return res.data.data;
  },

  revoke: async (matchId: string, permissionId: string) => {
    const res = await api.delete(`/matches/${matchId}/permissions/${permissionId}`);
    return res.data.data;
  },
};