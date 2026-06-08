// pages/TournamentDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Users, Activity, BarChart2, Plus,
  Edit2, Trash2, MapPin, X
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { tournamentService } from "../services/tournament.service";
import { teamService } from "../services/team.service";
import { useAppSelector } from "../hooks/useAppSelector";
import type { TournamentDetail, Team, Match, PointsRow } from "../features/tournament/tournament.types";

type Tab = "overview" | "matches" | "teams" | "points";

// ── Create Team Modal ─────────────────────────────────────────────
const teamSchema = z.object({
  teamName: z.string().min(2, "Min 2 characters").max(50),
  teamLogo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type TeamForm = z.infer<typeof teamSchema>;

const CreateTeamModal = ({
  tournamentId, onClose, onSuccess,
}: {
  tournamentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: TeamForm) =>
      teamService.create({
        tournamentId,
        teamName: data.teamName,
        teamLogo: data.teamLogo || undefined,
      }),
    onSuccess: () => {
      toast.success("Team created!");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create team");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Create Team</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Team Name</label>
            <input
              {...register("teamName")}
              placeholder="Warriors XI"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
            />
            {errors.teamName && (
              <p className="text-red-400 text-xs mt-1.5">{errors.teamName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Team Logo URL <span className="text-white/25">(optional)</span>
            </label>
            <input
              {...register("teamLogo")}
              placeholder="https://..."
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
            />
            {errors.teamLogo && (
              <p className="text-red-400 text-xs mt-1.5">{errors.teamLogo.message}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {mutation.isPending ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit Tournament Modal ────────────────────────────────────────
const editSchema = z.object({
  tournamentName: z.string().min(2, "Min 2 characters").max(100),
  organizationName: z.string().min(2, "Min 2 characters").max(100),
});
type EditForm = z.infer<typeof editSchema>;

const EditTournamentModal = ({
  tournament,
  onClose,
  onSuccess,
}: {
  tournament: { tournament_id: string; tournament_name: string; organization_name: string };
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      tournamentName: tournament.tournament_name,
      organizationName: tournament.organization_name,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EditForm) =>
      tournamentService.update(tournament.tournament_id, {
        tournamentName: data.tournamentName,
        organizationName: data.organizationName,
      }),
    onSuccess: () => {
      toast.success("Tournament updated!");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update tournament");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Edit Tournament</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Tournament Name</label>
            <input
              {...register("tournamentName")}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
            />
            {errors.tournamentName && (
              <p className="text-red-400 text-xs mt-1.5">{errors.tournamentName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Organization Name</label>
            <input
              {...register("organizationName")}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
            />
            {errors.organizationName && (
              <p className="text-red-400 text-xs mt-1.5">{errors.organizationName.message}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {mutation.isPending ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Match Status Badge ────────────────────────────────────────────
const MatchBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live:      "bg-red-500/15 text-red-400 border-red-500/25",
    completed: "bg-white/5 text-white/35 border-white/10",
    scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    upcoming:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-2 py-0.5 ${map[status] ?? map.scheduled}`}>
      {status === "live" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 mb-0.5" />
      )}
      {status}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────
const TournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ FIXED: get both isAuthenticated and user
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const [tab, setTab] = useState<Tab>("overview");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditTournament, setShowEditTournament] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, error } = useQuery<TournamentDetail>({
    queryKey: ["tournament", id],
    queryFn: () => tournamentService.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => tournamentService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament deleted");
      navigate("/tournaments");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete");
    },
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState />;

  const { tournament, teams, matches, pointsTable } = data;

  // ✅ FIXED: both are strings, no Number() conversion needed
  console.log("Redux User", user);
console.log("Tournament", tournament);

console.log("Redux User ID:", user?.userId);
console.log("Tournament Owner ID:", tournament?.created_by_user_id);
  const isOwner =
    isAuthenticated &&
    !!user &&
    String(user.userId) === String(tournament.created_by_user_id);

  const liveMatches = matches.filter((m) => m.status === "live");
  const upcomingMatches = matches.filter(
    (m) => m.status === "scheduled" || m.status === "upcoming"
  );
  const completedMatches = matches.filter((m) => m.status === "completed");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "matches",  label: "Matches",      count: matches.length },
    { key: "teams",    label: "Teams",        count: teams.length },
    { key: "points",   label: "Points Table" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Tournament Header ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy size={24} className="text-green-500" />
              </div>
              <div>
                <h1 className="text-white text-xl font-semibold">
                  {tournament.tournament_name}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">
                  {tournament.organization_name}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {/* ✅ removed date display */}
                  <span className="text-white/20 text-xs">
                    by {tournament.created_by_username}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner only — Edit + Delete */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditTournament(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/50 hover:text-white/80 text-sm transition-colors border border-white/[0.07]"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors border border-red-500/20"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/[0.06]">
            {[
              { label: "Teams",         value: teams.length,        color: "text-white" },
              { label: "Total Matches", value: matches.length,      color: "text-white" },
              { label: "Live Now",      value: liveMatches.length,  color: liveMatches.length > 0 ? "text-red-400" : "text-white" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/[0.07] rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.key
                  ? "bg-green-500 text-white"
                  : "text-white/40 hover:text-white/70"}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${tab === t.key
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/30"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            {liveMatches.length > 0 && (
              <section>
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Live Now
                </h3>
                <div className="space-y-2">
                  {liveMatches.map((m) => (
                    <MatchCard key={m.match_id} match={m}
                      onClick={() => navigate(`/matches/${m.match_id}`)} />
                  ))}
                </div>
              </section>
            )}

            {upcomingMatches.length > 0 && (
              <section>
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
                  Upcoming
                </h3>
                <div className="space-y-2">
                  {upcomingMatches.slice(0, 3).map((m) => (
                    <MatchCard key={m.match_id} match={m}
                      onClick={() => navigate(`/matches/${m.match_id}`)} />
                  ))}
                </div>
              </section>
            )}

            {completedMatches.length > 0 && (
              <section>
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
                  Recent Results
                </h3>
                <div className="space-y-2">
                  {completedMatches.slice(0, 3).map((m) => (
                    <MatchCard key={m.match_id} match={m}
                      onClick={() => navigate(`/matches/${m.match_id}`)} />
                  ))}
                </div>
              </section>
            )}

            {matches.length === 0 && (
              <EmptyState icon={<Activity size={28} />} text="No matches yet" />
            )}
          </div>
        )}

        {/* ── Matches Tab ── */}
        {tab === "matches" && (
          <div className="space-y-4">
            {/* ✅ Create Match button — owner only */}
            {isOwner && (
              <div className="flex justify-end">
                <button
                  onClick={() => navigate(`/tournaments/${id}/create-match`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Plus size={15} />
                  Create Match
                </button>
              </div>
            )}
            {matches.length === 0 ? (
              <EmptyState icon={<Activity size={28} />} text="No matches created yet" />
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <MatchCard key={m.match_id} match={m}
                    onClick={() => navigate(`/matches/${m.match_id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Teams Tab ── */}
        {tab === "teams" && (
          <div className="space-y-4">
            {isOwner && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Plus size={15} />
                  Create Team
                </button>
              </div>
            )}
            {teams.length === 0 ? (
              <EmptyState icon={<Users size={28} />} text="No teams yet" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {teams.map((t) => (
                  <TeamCard
                    key={t.team_id}
                    team={t}
                    isOwner={isOwner}
                    onDelete={() => {
                      teamService.delete(t.team_id)
                        .then(() => {
                          queryClient.invalidateQueries({ queryKey: ["tournament", id] });
                          toast.success("Team deleted");
                        })
                        .catch((e) =>
                          toast.error(e?.response?.data?.message || "Failed")
                        );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Points Table Tab ── */}
        {tab === "points" && (
  <div>
    {pointsTable.length === 0 ? (
      <EmptyState icon={<BarChart2 size={28} />} text="Points table not available yet" />
    ) : (
      <>
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["#", "Team", "M", "W", "L", "T", "NR", "Pts", "NRR"].map((h) => (
                    <th key={h} className="px-4 py-3 text-white/30 font-medium text-xs text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((row, i) => (
                  <tr
                    key={row.team_id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors
                      ${i === 0 ? "bg-green-500/5" : ""}`}
                  >
                    <td className="px-4 py-3 text-white/30 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{row.team_name}</td>
                    <td className="px-4 py-3 text-white/50">{row.matches_played}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">{row.wins}</td>
                    <td className="px-4 py-3 text-red-400">{row.losses}</td>
                    <td className="px-4 py-3 text-white/50">{row.ties}</td>
                    <td className="px-4 py-3 text-white/50">{row.no_results}</td>
                    <td className="px-4 py-3 text-white font-bold">{row.points}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {row.net_run_rate >= 0 ? "+" : ""}
                      {Number(row.net_run_rate).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </div>
)}

      </div>

      {/* ── Create Team Modal ── */}
      {showCreateTeam && (
        <CreateTeamModal
          tournamentId={id!}
          onClose={() => setShowCreateTeam(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["tournament", id] })
          }
        />
      )}

      {/* ── Edit Tournament Modal ── */}
      {showEditTournament && (
        <EditTournamentModal
          tournament={tournament}
          onClose={() => setShowEditTournament(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["tournament", id] })
          }
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Tournament?</h2>
            <p className="text-white/40 text-sm mb-6">
              This will permanently delete{" "}
              <span className="text-white/70">{tournament.tournament_name}</span> and
              all its teams and matches.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub Components ────────────────────────────────────────────────
const MatchCard = ({
  match: m, onClick,
}: {
  match: Match;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="bg-[#1f1f1f] border border-white/[0.07] rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-white/20 transition-all cursor-pointer"
  >
    <div className="min-w-0">
      <p className="text-white font-medium text-sm">
        {m.team1_name}{" "}
        <span className="text-white/25 font-normal">vs</span>{" "}
        {m.team2_name}
      </p>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="flex items-center gap-1 text-white/25 text-xs">
          <MapPin size={10} /> {m.ground_name}
        </span>
        <span className="text-white/20 text-xs">
          {m.match_type} · {m.overs} ov
        </span>
        {m.winner_team_name && (
          <span className="text-green-400 text-xs font-medium">
            🏆 {m.winner_team_name} won
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3 flex-shrink-0">
      <MatchBadge status={m.status} />
      <span className="text-white/20 text-xs">#{m.match_no}</span>
    </div>
  </div>
);

const TeamCard = ({
  team: t, isOwner, onDelete,
}: {
  team: Team;
  isOwner: boolean;
  onDelete: () => void;
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#1f1f1f] border border-white/[0.07] rounded-xl px-4 py-4 flex items-center gap-3 hover:border-white/15 transition-all">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
        {t.team_logo ? (
          <img src={t.team_logo} alt="" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <Users size={16} className="text-white/25" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{t.team_name}</p>
        <p className="text-white/30 text-xs mt-0.5">Tap to view players</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/teams/${t.team_id}`)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/50 hover:text-white/80 text-xs font-medium transition-colors border border-white/[0.07]"
        >
          View →
        </button>
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({
  icon, text,
}: {
  icon: React.ReactNode;
  text: string;
}) => (
  <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl py-16 flex flex-col items-center gap-3">
    <div className="text-white/10">{icon}</div>
    <p className="text-white/25 text-sm">{text}</p>
  </div>
);

const PageLoader = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/20 text-sm animate-pulse">Loading...</div>
  </div>
);

const ErrorState = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/30 text-sm">Tournament not found</div>
  </div>
);

export default TournamentDetailPage;