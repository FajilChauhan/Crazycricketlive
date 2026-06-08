// pages/PlayerProfilePage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Trophy, Target, Zap, Activity,
  MapPin, Crown, Mail, CheckCircle2, XCircle, Minus
} from "lucide-react";
import { matchService } from "../services/match.service";
import { userService } from "../services/user.service";

// ── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live:      "bg-red-500/15 text-red-400 border-red-500/25",
    completed: "bg-white/5 text-white/35 border-white/10",
    upcoming:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
    abandoned: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    cancelled: "bg-red-500/10 text-red-300/60 border-red-500/15",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-2 py-0.5 ${map[status] ?? map.upcoming}`}>
      {status === "live" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 mb-0.5" />
      )}
      {status}
    </span>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────
const StatCard = ({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) => (
  <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl p-4 text-center">
    <div className={`flex justify-center mb-1.5 ${color}`}>{icon}</div>
    <p className="text-white text-xl font-bold">{value}</p>
    <p className="text-white/30 text-xs mt-0.5">{label}</p>
  </div>
);

const PlayerProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["player-profile", userId],
    queryFn: () => userService.getUserById(userId!),
    enabled: !!userId,
  });

  // Fetch player stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["player-stats", userId],
    queryFn: () => matchService.getPlayerStats(userId!),
    enabled: !!userId,
  });

  // Fetch player match history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["player-history", userId],
    queryFn: () => matchService.getPlayerHistory(userId!),
    enabled: !!userId,
  });

  const isLoading = profileLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
        <p className="text-white/20 animate-pulse text-sm">Loading player...</p>
      </div>
    );
  }

  if (!profile && !isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#111] flex flex-col items-center justify-center gap-4">
        <p className="text-white/30">Player not found</p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-green-400 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const displayName = profile?.username ?? "Unknown Player";
  const initials = displayName.slice(0, 2).toUpperCase();

  const strikeRate = stats?.totalRuns && stats?.totalBalls
    ? ((stats.totalRuns / stats.totalBalls) * 100).toFixed(1)
    : "—";

  // Determine result for each match
  const getResult = (m: any): "won" | "lost" | "tie" | "na" => {
    if (m.status !== "completed") return "na";
    if (!m.winner_team_id) return "tie";
    if (m.player_team_id && m.winner_team_id === m.player_team_id) return "won";
    return "lost";
  };

  const ResultBadge = ({ result }: { result: "won" | "lost" | "tie" | "na" }) => {
    if (result === "won") return (
      <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
        <CheckCircle2 size={12} /> Won
      </span>
    );
    if (result === "lost") return (
      <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
        <XCircle size={12} /> Lost
      </span>
    );
    if (result === "tie") return (
      <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
        <Minus size={12} /> Tie
      </span>
    );
    return null;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden mx-auto sm:mx-0">
              {profile?.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-500/30 to-green-700/30 border border-green-500/20 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-grow flex flex-col items-center sm:items-start min-w-0 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <h1 className="text-white text-2xl font-bold">{displayName}</h1>
                {profile?.is_captain && (
                  <span className="flex items-center gap-1 text-yellow-400 text-xs border border-yellow-500/25 bg-yellow-500/10 rounded-full px-2 py-0.5">
                    <Crown size={10} /> Captain
                  </span>
                )}
              </div>
              {profile?.email && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail size={12} className="text-white/25" />
                  <p className="text-white/40 text-sm">{profile.email}</p>
                </div>
              )}
              {profile?.role && (
                <p className="text-white/30 text-sm mt-1 capitalize">{profile.role}</p>
              )}
              <span className="inline-block mt-2 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-0.5 font-medium">
                Active Player
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Target size={18} />}
            label="Matches"
            value={stats?.totalMatches ?? (history as any[]).length}
            color="text-blue-400"
          />
          <StatCard
            icon={<Zap size={18} />}
            label="Total Runs"
            value={stats?.totalRuns ?? 0}
            color="text-yellow-400"
          />
          <StatCard
            icon={<Activity size={18} />}
            label="Wickets"
            value={stats?.totalWickets ?? 0}
            color="text-red-400"
          />
          <StatCard
            icon={<Trophy size={18} />}
            label="Wins"
            value={(history as any[]).filter((m: any) => getResult(m) === "won").length}
            color="text-green-400"
          />
        </div>

        {/* ── Performance Cards ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Batting */}
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={12} className="text-yellow-400" /> Batting
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Total Runs</span>
                <span className="text-yellow-400 font-bold text-lg">{stats?.totalRuns ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Matches</span>
                <span className="text-white font-semibold">{stats?.totalMatches ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Strike Rate</span>
                <span className="text-white/70 font-semibold">{strikeRate}</span>
              </div>
            </div>
          </div>

          {/* Bowling */}
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={12} className="text-red-400" /> Bowling
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Wickets</span>
                <span className="text-red-400 font-bold text-lg">{stats?.totalWickets ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Matches</span>
                <span className="text-white font-semibold">{stats?.totalMatches ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Match History ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-white font-semibold">Match History</h3>
            <span className="text-white/25 text-xs">{(history as any[]).length} matches</span>
          </div>

          {historyLoading ? (
            <div className="py-12 text-center text-white/20 text-sm animate-pulse">Loading...</div>
          ) : (history as any[]).length === 0 ? (
            <div className="py-12 text-center">
              <Target size={28} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/20 text-sm">No match history yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {(history as any[]).map((m: any) => {
                const result = getResult(m);
                return (
                  <div
                    key={m.match_id}
                    onClick={() => navigate(`/matches/${m.match_id}`)}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Teams */}
                      <p className="text-white font-medium text-sm">
                        {m.team1_name}
                        <span className="text-white/25 mx-1.5">vs</span>
                        {m.team2_name}
                      </p>
                      {/* Player's team */}
                      {m.player_team_name && (
                        <p className="text-white/35 text-xs mt-0.5">
                          Playing for: <span className="text-white/60">{m.player_team_name}</span>
                        </p>
                      )}
                      {/* Ground + tournament */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {m.ground_name && (
                          <span className="flex items-center gap-1 text-white/30 text-xs">
                            <MapPin size={10} /> {m.ground_name}
                          </span>
                        )}
                        <span className="text-white/20 text-xs">{m.match_type} · {m.overs} ov</span>
                        {m.tournament_name && (
                          <span className="text-white/20 text-xs truncate">{m.tournament_name}</span>
                        )}
                      </div>
                      {/* Winner */}
                      {m.winner_team_name && (
                        <p className="text-white/25 text-xs mt-0.5 flex items-center gap-1">
                          <Trophy size={9} className="text-yellow-400/50" />
                          {m.winner_team_name} won
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={m.status} />
                      {m.status === "completed" && <ResultBadge result={result} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PlayerProfilePage;
