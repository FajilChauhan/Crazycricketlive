// pages/SearchPage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Trophy, Users, Activity,
  User, X
} from "lucide-react";
import { searchService } from "../services/search.service";
import { getImageUrl } from "../utils/image";

type Filter = "all" | "tournaments" | "teams" | "matches" | "users";

const FILTERS: { key: Filter; label: string; icon: React.ReactNode }[] = [
  { key: "all",         label: "All",         icon: <Search size={13} /> },
  { key: "tournaments", label: "Tournaments", icon: <Trophy size={13} /> },
  { key: "teams",       label: "Teams",       icon: <Users size={13} /> },
  { key: "matches",     label: "Matches",     icon: <Activity size={13} /> },
  { key: "users",       label: "Players",     icon: <User size={13} /> },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard shortcut /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const shouldSearch = debouncedQuery.trim().length >= 2;

  const { data: allResults, isLoading } = useQuery({
    queryKey: ["search-all", debouncedQuery],
    queryFn: () => searchService.searchAll(debouncedQuery),
    enabled: shouldSearch && filter === "all",
  });

  const { data: tournamentResults, isLoading: loadingT } = useQuery({
    queryKey: ["search-tournaments", debouncedQuery],
    queryFn: () => searchService.searchTournaments(debouncedQuery),
    enabled: shouldSearch && filter === "tournaments",
  });

  const { data: teamResults, isLoading: loadingTm } = useQuery({
    queryKey: ["search-teams", debouncedQuery],
    queryFn: () => searchService.searchTeams(debouncedQuery),
    enabled: shouldSearch && filter === "teams",
  });

  const { data: matchResults, isLoading: loadingM } = useQuery({
    queryKey: ["search-matches", debouncedQuery],
    queryFn: () => searchService.searchMatches(debouncedQuery),
    enabled: shouldSearch && filter === "matches",
  });

  const { data: userResults, isLoading: loadingU } = useQuery({
    queryKey: ["search-users", debouncedQuery],
    queryFn: () => searchService.searchUsers(debouncedQuery),
    enabled: shouldSearch && filter === "users",
  });

  const loading = isLoading || loadingT || loadingTm || loadingM || loadingU;

  // Get results based on filter
  const tournaments = filter === "all" ? (allResults?.tournaments ?? []) : (tournamentResults ?? []);
  const teams       = filter === "all" ? (allResults?.teams ?? [])       : (teamResults ?? []);
  const matches     = filter === "all" ? (allResults?.matches ?? [])     : (matchResults ?? []);
  const users       = filter === "all" ? (allResults?.users ?? [])       : (userResults ?? []);

  const totalResults = tournaments.length + teams.length + matches.length + users.length;
  const hasResults = totalResults > 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Search Input ── */}
        <div>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments, teams, players, matches..."
              className="w-full bg-[#1a1a1a] border border-white/[0.09] rounded-2xl pl-12 pr-12 py-4 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${filter === f.key
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-[#1a1a1a] text-white/40 border-white/[0.07] hover:border-white/15 hover:text-white/60"}`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty state ── */}
        {!shouldSearch && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Search size={36} className="text-white/10" />
            <p className="text-white/25 text-sm">Type at least 2 characters to search</p>
            <p className="text-white/15 text-xs">Search across tournaments, teams, players and matches</p>
          </div>
        )}

        {/* Loading */}
        {shouldSearch && loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {/* No results */}
        {shouldSearch && !loading && !hasResults && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Search size={32} className="text-white/10" />
            <p className="text-white/25 text-sm">No results for "{debouncedQuery}"</p>
          </div>
        )}

        {/* ── Results ── */}
        {shouldSearch && !loading && hasResults && (
          <div className="space-y-6">

            {/* Tournaments */}
            {tournaments.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Trophy size={12} /> Tournaments ({tournaments.length})
                </p>
                <div className="space-y-2">
                  {tournaments.map((t: any) => (
                    <div
                      key={t.tournament_id}
                      onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                      className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-white/20 hover:bg-[#1f1f1f] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center flex-shrink-0">
                          <Trophy size={14} className="text-green-500/70" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{t.tournament_name}</p>
                          <p className="text-white/35 text-xs">{t.organization_name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            {teams.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users size={12} /> Teams ({teams.length})
                </p>
                <div className="space-y-2">
                  {teams.map((t: any) => (
                    <div
                      key={t.team_id}
                      onClick={() => navigate(`/teams/${t.team_id}`)}
                      className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-white/20 hover:bg-[#1f1f1f] transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0">
                        {t.team_logo
                          ? <img src={getImageUrl(t.team_logo)} alt="" className="w-full h-full object-cover rounded-xl" />
                          : t.team_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{t.team_name}</p>
                        <p className="text-white/35 text-xs truncate">{t.tournament_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matches */}
            {matches.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={12} /> Matches ({matches.length})
                </p>
                <div className="space-y-2">
                  {matches.map((m: any) => (
                    <div
                      key={m.match_id}
                      onClick={() => navigate(`/matches/${m.match_id}`)}
                      className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-white/20 hover:bg-[#1f1f1f] transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {m.team1_name} <span className="text-white/25">vs</span> {m.team2_name}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">{m.ground_name} · {m.match_type}</p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase border rounded px-2 py-0.5 flex-shrink-0
                        ${m.status === "live" ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-white/5 text-white/30 border-white/10"}`}>
                        {m.status === "live" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 mb-0.5" />
                        )}
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {users.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User size={12} /> Players ({users.length})
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {users.map((u: any) => (
                    <div
                      key={u.userId ?? u.user_id}
                      onClick={() => navigate(`/players/${u.userId ?? u.user_id}`)}
                      className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-white/20 hover:bg-[#1f1f1f] transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-[11px] font-bold text-purple-400 flex-shrink-0">
                        {u.profileImage ?? u.profile_image
                          ? <img src={getImageUrl(u.profileImage ?? u.profile_image)} alt="" className="w-full h-full object-cover rounded-xl" />
                          : u.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.username}</p>
                        <p className="text-white/35 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;