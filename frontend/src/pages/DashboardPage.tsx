// pages/DashboardPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Users, Activity, Zap,
  MapPin, Clock, ChevronRight, Search
} from "lucide-react";
import { dashboardService } from "../services/dashboard.service";
import { useAppSelector } from "../hooks/useAppSelector";

// ── Helpers ───────────────────────────────────────────────────────
const oversStr = (balls: number) =>
  balls == null ? "0.0" : `${Math.floor(balls / 6)}.${balls % 6}`;

const fmtTime = (dt: string) =>
  new Date(dt).toLocaleString("en-IN", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

// ── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live:      "bg-red-500/15 text-red-400 border-red-500/25",
    upcoming:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
    completed: "bg-white/5 text-white/30 border-white/10",
    ongoing:   "bg-green-500/10 text-green-400 border-green-500/20",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 inline-flex items-center gap-1 ${map[status] ?? map.upcoming}`}>
      {status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      {status}
    </span>
  );
};

// ── Cricbuzz-style Live Match Card ────────────────────────────────
const LiveMatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => {
  const inn1Batting = match.team1_id === match.current_batting_team_id;
  
  // Team 1 score
  const t1Score = match.team1_runs != null
    ? `${match.team1_runs}/${match.team1_wickets ?? 0}`
    : null;
  const t1Overs = match.team1_balls != null ? `(${oversStr(match.team1_balls)})` : null;
  
  // Team 2 score
  const t2Score = match.team2_runs != null
    ? `${match.team2_runs}/${match.team2_wickets ?? 0}`
    : null;
  const t2Overs = match.team2_balls != null ? `(${oversStr(match.team2_balls)})` : null;

  const isBatting1 = match.current_innings_no === 1 
    ? match.current_batting_team_id !== null 
    : false;

  return (
    <div
      onClick={onClick}
      className="bg-[#181818] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/30 hover:bg-[#1c1c1c] transition-all group"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-[#141414]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </span>
          {match.tournament_name && (
            <>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-white/30 text-[11px] truncate">{match.tournament_name}</span>
            </>
          )}
        </div>
        <span className="text-white/20 text-[10px] flex-shrink-0">{match.match_type} · {match.overs} ov</span>
      </div>

      {/* Scores */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Team 1 */}
        <div className={`flex items-center justify-between gap-2 ${
          match.current_batting_team_id && match.current_innings_no === 1 ? "opacity-100" : 
          t1Score ? "opacity-80" : "opacity-40"
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[9px] font-bold text-white/40 flex-shrink-0">
              {match.team1_name?.slice(0, 2).toUpperCase()}
            </div>
            <p className={`text-sm font-semibold truncate ${
              match.current_innings_no === 1 && match.current_batting_team_id
                ? "text-white" : "text-white/60"
            }`}>{match.team1_name}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {t1Score ? (
              <>
                <span className="text-white font-bold text-base tabular-nums">{t1Score}</span>
                {t1Overs && <span className="text-white/30 text-xs tabular-nums">{t1Overs}</span>}
              </>
            ) : (
              <span className="text-white/20 text-sm">Yet to bat</span>
            )}
          </div>
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between gap-2 ${
          t2Score ? "opacity-90" : "opacity-40"
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[9px] font-bold text-white/40 flex-shrink-0">
              {match.team2_name?.slice(0, 2).toUpperCase()}
            </div>
            <p className={`text-sm font-semibold truncate ${
              match.current_innings_no === 2 && match.current_batting_team_id
                ? "text-white" : "text-white/60"
            }`}>{match.team2_name}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {t2Score ? (
              <>
                <span className="text-white font-bold text-base tabular-nums">{t2Score}</span>
                {t2Overs && <span className="text-white/30 text-xs tabular-nums">{t2Overs}</span>}
              </>
            ) : (
              <span className="text-white/20 text-sm">Yet to bat</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {match.ground_name && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-white/[0.04]">
          <MapPin size={10} className="text-white/15 flex-shrink-0" />
          <span className="text-white/20 text-[10px] truncate">{match.ground_name}</span>
          <ChevronRight size={12} className="text-white/10 ml-auto flex-shrink-0 group-hover:text-white/30 transition-colors" />
        </div>
      )}
    </div>
  );
};

// ── Upcoming Match Card ───────────────────────────────────────────
const UpcomingMatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="bg-[#181818] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-white/15 hover:bg-[#1c1c1c] transition-all group"
  >
    <div className="w-9 h-9 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
      <Clock size={14} className="text-blue-400/60" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-medium truncate">
        {match.team1_name} <span className="text-white/20">vs</span> {match.team2_name}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {match.tournament_name && (
          <span className="text-white/25 text-[10px] truncate">{match.tournament_name}</span>
        )}
        {match.scheduled_start_at && (
          <>
            {match.tournament_name && <span className="text-white/10">·</span>}
            <span className="text-white/30 text-[10px] flex-shrink-0">{fmtTime(match.scheduled_start_at)}</span>
          </>
        )}
      </div>
    </div>
    <ChevronRight size={14} className="text-white/15 flex-shrink-0 group-hover:text-white/40 transition-colors" />
  </div>
);

// ── Tournament Card ───────────────────────────────────────────────
const TournamentCard = ({ tournament, onClick }: { tournament: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="bg-[#181818] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-white/15 hover:bg-[#1c1c1c] transition-all group"
  >
    <div className="w-9 h-9 rounded-xl bg-green-500/8 border border-green-500/12 flex items-center justify-center flex-shrink-0">
      <Trophy size={14} className="text-green-500/60" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-medium truncate group-hover:text-green-400/80 transition-colors">
        {tournament.tournament_name}
      </p>
      <p className="text-white/30 text-[10px] truncate mt-0.5">{tournament.organization_name}</p>
    </div>
    <StatusBadge status={tournament.status} />
  </div>
);

// ── Player Card ───────────────────────────────────────────────────
const PlayerCard = ({ player, rank }: { player: any; rank: number }) => {
  const navigate = useNavigate();
  const initials = player.username?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div
      onClick={() => navigate(`/players/${player.user_id}`)}
      className="bg-[#181818] border border-white/[0.07] rounded-2xl p-4 cursor-pointer hover:border-white/15 hover:bg-[#1c1c1c] transition-all"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[11px] font-bold text-white/50">
            {player.profile_image
              ? <img src={player.profile_image} alt="" className="w-full h-full object-cover rounded-xl" />
              : initials}
          </div>
          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black
            ${rank === 1 ? "bg-yellow-400 text-black" : rank === 2 ? "bg-white/30 text-white" : rank === 3 ? "bg-orange-500/80 text-white" : "bg-white/8 text-white/30"}`}>
            {rank}
          </span>
        </div>
        <p className="text-white text-xs font-semibold truncate">{player.username}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-yellow-500/6 border border-yellow-500/12 rounded-lg px-2.5 py-2 text-center">
          <p className="text-yellow-400 font-bold text-lg leading-none">{player.total_runs}</p>
          <p className="text-yellow-400/40 text-[9px] mt-0.5 font-medium uppercase tracking-wide">Runs</p>
        </div>
        <div className="bg-red-500/6 border border-red-500/12 rounded-lg px-2.5 py-2 text-center">
          <p className="text-red-400 font-bold text-lg leading-none">{player.total_wickets}</p>
          <p className="text-red-400/40 text-[9px] mt-0.5 font-medium uppercase tracking-wide">Wkts</p>
        </div>
      </div>
    </div>
  );
};

// ── Section Header ────────────────────────────────────────────────
const SectionHeader = ({
  title, icon, count, onSeeAll,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  onSeeAll?: () => void;
}) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-white font-semibold text-sm tracking-wide uppercase">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-semibold">
          {count}
        </span>
      )}
    </div>
    {onSeeAll && (
      <button
        onClick={onSeeAll}
        className="text-green-400/70 text-xs font-medium hover:text-green-400 transition-colors flex items-center gap-1"
      >
        See all <ChevronRight size={12} />
      </button>
    )}
  </div>
);

// ── Skeletons ─────────────────────────────────────────────────────
const SkeletonCards = ({ count }: { count: number }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#181818] border border-white/[0.07] rounded-2xl h-[130px] animate-pulse" />
    ))}
  </div>
);
const SkeletonList = ({ count }: { count: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#181818] border border-white/[0.07] rounded-xl h-[60px] animate-pulse" />
    ))}
  </div>
);
const EmptyState = ({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) => (
  <div className="bg-[#181818] border border-white/[0.07] rounded-2xl py-10 flex flex-col items-center gap-2">
    <div className="text-white/10">{icon}</div>
    <p className="text-white/25 text-sm">{text}</p>
    {sub && <p className="text-white/15 text-xs">{sub}</p>}
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardService.getSummary,
    refetchInterval: 30000,
  });

  const { data: liveMatchesData, isLoading: loadingLive } = useQuery({
    queryKey: ["dashboard-live"],
    queryFn: dashboardService.getLiveMatches,
    refetchInterval: 10000,
  });
  const liveMatches = Array.isArray(liveMatchesData) ? liveMatchesData : [];

  const { data: upcomingMatchesData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["dashboard-upcoming"],
    queryFn: dashboardService.getUpcomingMatches,
  });
  const upcomingMatches = Array.isArray(upcomingMatchesData) ? upcomingMatchesData : [];

  const { data: recentTournamentsData, isLoading: loadingTournaments } = useQuery({
    queryKey: ["dashboard-tournaments"],
    queryFn: dashboardService.getRecentTournaments,
  });
  const recentTournaments = Array.isArray(recentTournamentsData) ? recentTournamentsData : [];

  const { data: topPlayersData, isLoading: loadingPlayers } = useQuery({
    queryKey: ["dashboard-top-players"],
    queryFn: dashboardService.getTopPlayers,
  });
  const topPlayers = Array.isArray(topPlayersData) ? topPlayersData : [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-7">
      <div className="max-w-5xl mx-auto space-y-7">

        {/* ── Hero ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {isAuthenticated && user ? (
              <>
                <h1 className="text-white text-xl font-bold tracking-tight">
                  {greeting()}, {user.username} 👋
                </h1>
                <p className="text-white/30 text-sm mt-0.5">
                  Here's what's happening in cricket today
                </p>
              </>
            ) : (
              <>
                <h1 className="text-white text-xl font-bold tracking-tight">🏏 GullyCricketLive</h1>
                <p className="text-white/30 text-sm mt-0.5">Live scores · Tournaments · Stats</p>
              </>
            )}
          </div>
          <button
            onClick={() => navigate("/search")}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#181818] border border-white/[0.07] rounded-xl text-white/30 text-sm hover:border-white/15 hover:text-white/50 transition-all"
          >
            <Search size={14} />
            Search...
          </button>
        </div>

        {/* ── Summary Stats ── */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Live",
                value: summary.liveMatches ?? liveMatches.length,
                icon: <Zap size={15} />,
                color: "text-red-400",
                bg: "bg-red-500/8 border-red-500/15",
                pulse: true,
              },
              {
                label: "Tournaments",
                value: summary.totalTournaments ?? 0,
                icon: <Trophy size={15} />,
                color: "text-green-400",
                bg: "bg-green-500/8 border-green-500/12",
              },
              {
                label: "Teams",
                value: summary.totalTeams ?? 0,
                icon: <Users size={15} />,
                color: "text-blue-400",
                bg: "bg-blue-500/8 border-blue-500/12",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[#181818] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${s.color} ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${s.value > 0 && s.pulse ? "text-red-400" : "text-white"}`}>
                    {s.value}
                    {s.pulse && s.value > 0 && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse ml-1 mb-1" />
                    )}
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Live Matches ── */}
        <div>
          <SectionHeader
            title="Live Now"
            icon={<Zap size={14} className="text-red-400" />}
            count={liveMatches.length}
          />
          {loadingLive ? (
            <SkeletonCards count={2} />
          ) : liveMatches.length === 0 ? (
            <EmptyState
              icon={<Zap size={24} />}
              text="No live matches right now"
              sub="Check back soon"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {liveMatches.map((m: any) => (
                <LiveMatchCard
                  key={m.match_id}
                  match={m}
                  onClick={() => navigate(`/matches/${m.match_id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Upcoming Matches ── */}
        {(loadingUpcoming || upcomingMatches.length > 0) && (
          <div>
            <SectionHeader
              title="Upcoming"
              icon={<Clock size={14} className="text-blue-400" />}
              count={upcomingMatches.length}
            />
            {loadingUpcoming ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-2">
                {upcomingMatches.slice(0, 5).map((m: any) => (
                  <UpcomingMatchCard
                    key={m.match_id}
                    match={m}
                    onClick={() => navigate(`/matches/${m.match_id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Top Players ── */}
        <div>
          <SectionHeader
            title="Top Players"
            icon={<Activity size={14} className="text-purple-400" />}
          />
          {loadingPlayers ? (
            <SkeletonCards count={4} />
          ) : topPlayers.length === 0 ? (
            <EmptyState icon={<Activity size={24} />} text="No player stats yet" sub="Stats appear after matches are played" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topPlayers.slice(0, 8).map((p: any, i: number) => (
                <PlayerCard key={p.user_id} player={p} rank={i + 1} />
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Tournaments ── */}
        <div>
          <SectionHeader
            title="Tournaments"
            icon={<Trophy size={14} className="text-green-400" />}
            onSeeAll={() => navigate("/tournaments")}
          />
          {loadingTournaments ? (
            <SkeletonList count={3} />
          ) : recentTournaments.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} text="No tournaments yet" />
          ) : (
            <div className="space-y-2">
              {recentTournaments.slice(0, 5).map((t: any) => (
                <TournamentCard
                  key={t.tournament_id}
                  tournament={t}
                  onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;