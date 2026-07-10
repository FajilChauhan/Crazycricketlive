// services/match.service.ts
import api from "./api";

export const matchService = {
    create: async (body: {
      tournamentId: string;
      team1Id: string;
      team2Id: string;
      groundName: string;
      matchType: string;
      overs: number;
      matchNo: number;
      matchMode: "1v1" | "team";
      scheduledStartAt?: string;
    }) => {
    const res = await api.post("/matches", body);
    return res.data.data;
  },

  getById: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}`);
    return res.data.data;
  },

  getByTournament: async (tournamentId: string) => {
    const res = await api.get(`/matches/tournament/${tournamentId}`);
    return res.data.data;
  },

  getLiveScore: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/live`);
    return res.data.data;
  },

  update: async (matchId: string, body: any) => {
    const res = await api.put(`/matches/${matchId}`, body);
    return res.data.data;
  },

  delete: async (matchId: string) => {
    const res = await api.delete(`/matches/${matchId}`);
    return res.data.data;
  },

  updateToss: async (matchId: string, body: {
    tossWinnerTeamId: string;
    tossDecision: "bat" | "bowl";
  }) => {
    const res = await api.put(`/matches/${matchId}/toss`, body);
    return res.data.data;
  },

  updateStatus: async (matchId: string, body: { status: string }) => {
    const res = await api.put(`/matches/${matchId}/status`, body);
    return res.data.data;
  },

  // ── Playing XI ──────────────────────────────────────────────
  addPlayingXI: async (matchId: string, body: {
    teamId: string;
    playerIds: string[];
  }) => {
    const res = await api.post(`/matches/${matchId}/playing-xi`, body);
    return res.data.data;
  },

  getPlayingXI: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/playing-xi`);
    return res.data.data;
  },

  // ── Innings ─────────────────────────────────────────────────
  startInnings: async (matchId: string, body: {
    inningsNo: number;
    battingTeamId: string;
    bowlingTeamId: string;
    targetRuns?: number;
  }) => {
    const res = await api.post(`/matches/${matchId}/innings`, body);
    return res.data.data;
  },

  endInnings: async (matchId: string, inningsId: string) => {
    const res = await api.put(`/matches/${matchId}/innings/${inningsId}/end`, {});
    return res.data.data;
  },

  getInnings: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/innings`);
    return res.data.data;
  },

  // ── Balls ────────────────────────────────────────────────────
  addBall: async (matchId: string, body: {
    inningsId: string;
    overNumber: number;
    ballInOver: number;
    strikerId?: string;
    nonStrikerId?: string;
    bowlerId?: string;
    runsScored: number;
    extraRuns?: number;
    extraType?: string;
    isWicket?: boolean;
    wicketType?: string;
    isLegalDelivery?: boolean;
    commentary?: string;
  }) => {
    const res = await api.post(`/matches/${matchId}/balls`, body);
    return res.data.data;
  },

  getBalls: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/balls`);
    return res.data.data;
  },

  // ── Scorecard ────────────────────────────────────────────────
  getScorecard: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/scorecard`);
    return res.data.data;
  },

  getBattingScorecard: async (matchId: string, inningsId?: string) => {
    const url = inningsId
      ? `/matches/${matchId}/batting-scorecard?inningsId=${inningsId}`
      : `/matches/${matchId}/batting-scorecard`;
    const res = await api.get(url);
    return res.data.data;
  },

  getBowlingScorecard: async (matchId: string, inningsId?: string) => {
    const url = inningsId
      ? `/matches/${matchId}/bowling-scorecard?inningsId=${inningsId}`
      : `/matches/${matchId}/bowling-scorecard`;
    const res = await api.get(url);
    return res.data.data;
  },

  getSummary: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/summary`);
    return res.data.data;
  },

  // ── Players ──────────────────────────────────────────────────
  getPlayerStatus: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/player-status`);
    return res.data.data;
  },

  getPlayerHistory: async (userId: string) => {
    const res = await api.get(`/matches/players/${userId}/history`);
    return res.data.data;
  },

  getPlayerStats: async (userId: string) => {
    const res = await api.get(`/matches/players/${userId}/stats`);
    return res.data.data;
  },

  declareWinner: async (matchId: string, body: {
    winnerTeamId: string;
    winMargin?: number;
    winType?: "runs" | "wickets" | "super_over" | "tie";
    manOfTheMatchUserId?: string;
  }) => {
    const res = await api.put(`/matches/${matchId}/winner`, body);
    return res.data.data;
  },

  declareTie: async (matchId: string, manOfTheMatchUserId?: string) => {
    const res = await api.put(`/matches/${matchId}/tie`, { manOfTheMatchUserId });
    return res.data.data;
  },

  // ── Scoring State ────────────────────────────────────────────
  getScoringState: async (matchId: string) => {
    const res = await api.get(`/matches/${matchId}/scoring-state`);
    return res.data.data.state ?? res.data.data ?? null;
  },

  saveScoringState: async (matchId: string, body: Record<string, any>) => {
    const res = await api.put(`/matches/${matchId}/scoring-state`, body);
    return res.data.data.state ?? res.data.data ?? null;
  },

  clearScoringState: async (matchId: string) => {
    const res = await api.delete(`/matches/${matchId}/scoring-state`);
    return res.data.data;
  },

  getPredictions: async (matchId: string) => {
    const res = await api.get(`/predictions/match/${matchId}`);
    return res.data.data;
  },
};