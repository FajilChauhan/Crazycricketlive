// pages/TournamentsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Plus, Search } from "lucide-react";
import { tournamentService } from "../services/tournament.service";
import { useAppSelector } from "../hooks/useAppSelector";
import type { Tournament } from "../features/tournament/tournament.types";

const TournamentsPage = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    queryFn: tournamentService.getAll,
  });

  const filtered = tournaments.filter((t) =>
    t.tournament_name.toLowerCase().includes(search.toLowerCase()) ||
    t.organization_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-white text-2xl font-semibold tracking-tight">
              Tournaments
            </h1>
            <p className="text-white/35 text-sm mt-1">
              {tournaments.length} tournaments total
            </p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => navigate("/create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Create Tournament
            </button>
          )}
        </div>

        {/* Search only */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments or organizations..."
            className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/40 transition-all"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Trophy size={32} className="text-white/10" />
            <p className="text-white/25 text-sm">
              {search ? "No tournaments match your search" : "No tournaments yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
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
  );
};

const TournamentCard = ({
  tournament: t,
  onClick,
}: {
  tournament: Tournament;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-white/20 hover:bg-[#1f1f1f] transition-all cursor-pointer group"
  >
    <div className="flex items-center gap-4 min-w-0">
      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
        <Trophy size={18} className="text-green-500/70" />
      </div>
      <div className="min-w-0">
        <p className="text-white font-medium truncate group-hover:text-green-400 transition-colors">
          {t.tournament_name}
        </p>
        <p className="text-white/35 text-sm truncate">{t.organization_name}</p>
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl h-[68px] animate-pulse" />
    ))}
  </div>
);

export default TournamentsPage;