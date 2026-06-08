// services/teamMember.service.ts
import api from "./api";

export const teamMemberService = {
  // ✅ POST /teams/:teamId/members
  addMember: async (teamId: string, body: {
    userId: string;
    role?: string;
    isCaptain?: boolean;
    jerseyNumber?: number;
  }) => {
    const res = await api.post(`/teams/${teamId}/members`, body);
    return res.data.data;
  },

  // ✅ GET /teams/:teamId/members
  getMembers: async (teamId: string) => {
    const res = await api.get(`/teams/${teamId}/members`);
    return res.data.data;
  },

  // ✅ GET /teams/:teamId/members/:userId
  getMemberByUserId: async (teamId: string, userId: string) => {
    const res = await api.get(`/teams/${teamId}/members/${userId}`);
    return res.data.data;
  },

  // ✅ PUT /teams/:teamId/members/:userId
  updateMember: async (teamId: string, userId: string, body: {
    role?: string;
    isCaptain?: boolean;
    jerseyNumber?: number;
  }) => {
    const res = await api.put(`/teams/${teamId}/members/${userId}`, body);
    return res.data.data;
  },

  // ✅ DELETE /teams/:teamId/members/:userId
  deleteMember: async (teamId: string, userId: string) => {
    const res = await api.delete(`/teams/${teamId}/members/${userId}`);
    return res.data.data;
  },
};