// services/tournament.service.ts
import api from "./api";
import type { CreateTournamentBody, UpdateTournamentBody } from "../features/tournament/tournament.types";

export const tournamentService = {
  getAll: async () => {
    const res = await api.get("/tournaments");
    return res.data.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/tournaments/${id}`);
    return res.data.data;
  },

  create: async (body: CreateTournamentBody) => {
    const res = await api.post("/tournaments", body);
    return res.data.data;
  },

  update: async (id: string, body: UpdateTournamentBody) => {
    const res = await api.put(`/tournaments/${id}`, body);
    return res.data.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/tournaments/${id}`);
    return res.data.data;
  },
};