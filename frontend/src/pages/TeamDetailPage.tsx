// pages/TeamDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Crown, Plus, Trash2, X,
  Edit2, Shield, ArrowLeft, Hash
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { teamService } from "../services/team.service";
import { teamMemberService } from "../services/teamMember.service";
import { userService } from "../services/user.service";
import { useAppSelector } from "../hooks/useAppSelector";

// ── Types ─────────────────────────────────────────────────────────
interface Member {
  team_member_id: string;
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  role: string;
  is_captain: boolean;
  jersey_number: number | null;
  joined_at: string;
}

interface TeamData {
  team: {
    team_id: string;
    team_name: string;
    team_logo: string | null;
    tournament_id: string;
    tournament_name: string;
    created_by_user_id: string;
    created_by_username: string;
    created_at: string;
  };
  members: Member[];
}

// ── Add Player Modal ──────────────────────────────────────────────
const addSchema = z.object({
  userId: z.string().min(1, "Select a player"),
  role: z.string().min(1, "Select a role"),
  isCaptain: z.boolean(),
  jerseyNumber: z.string().optional(),
});
type AddForm = z.infer<typeof addSchema>;

const ROLES = ["player", "batsman", "bowler", "all_rounder", "keeper"];

const AddPlayerModal = ({
  teamId,
  tournamentId,
  existingMemberIds,
  onClose,
  onSuccess,
}: {
  teamId: string;
  tournamentId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { data: availableUsers = [] } = useQuery({
    queryKey: ["available-users-tournament", tournamentId],
    queryFn: () => userService.getAvailableUsersForTournament(tournamentId),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { isCaptain: false, role: "Player" },
  });

  const mutation = useMutation({
    mutationFn: (data: AddForm) =>
      teamMemberService.addMember(teamId, {
        userId: data.userId,
        role: data.role,
        isCaptain: data.isCaptain,
        jerseyNumber: data.jerseyNumber ? Number(data.jerseyNumber) : undefined,
      }),
    onSuccess: () => {
      toast.success("Player added!");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add player");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Add Player</h2>
          <button onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

          {/* Select User */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Select Player
            </label>
            <select
              {...register("userId")}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
            >
              <option value="">Choose a player...</option>
              {availableUsers.map((u: any) => (
                <option key={u.userId} value={u.userId}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="text-red-400 text-xs mt-1.5">{errors.userId.message}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Role</label>
            <select
              {...register("role")}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Jersey Number */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Jersey Number <span className="text-white/25">(optional)</span>
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                {...register("jerseyNumber")}
                type="number"
                min="1"
                max="999"
                placeholder="e.g. 7"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
              />
            </div>
          </div>

          {/* Captain Toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
            <input
              {...register("isCaptain")}
              type="checkbox"
              className="w-4 h-4 accent-green-500"
            />
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-1.5">
                <Crown size={14} className="text-yellow-400" />
                Make Captain
              </p>
              <p className="text-white/30 text-xs mt-0.5">
                Previous captain will be updated
              </p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {mutation.isPending ? "Adding..." : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit Member Modal ─────────────────────────────────────────────
const EditMemberModal = ({
  teamId,
  member,
  onClose,
  onSuccess,
}: {
  teamId: string;
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const editSchema = z.object({
    role: z.string().min(1),
    isCaptain: z.boolean(),
    jerseyNumber: z.string().optional(),
  });
  type EditForm = z.infer<typeof editSchema>;

  const { register, handleSubmit } = useForm<EditForm>({
    defaultValues: {
      role: member.role,
      isCaptain: member.is_captain,
      jerseyNumber: member.jersey_number?.toString() ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EditForm) =>
      teamMemberService.updateMember(teamId, member.user_id, {
        role: data.role,
        isCaptain: data.isCaptain,
        jerseyNumber: data.jerseyNumber ? Number(data.jerseyNumber) : undefined,
      }),
    onSuccess: () => {
      toast.success("Player updated!");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            Edit — {member.username}
          </h2>
          <button onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Role</label>
            <select
              {...register("role")}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Jersey Number <span className="text-white/25">(optional)</span>
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                {...register("jerseyNumber")}
                type="number"
                placeholder="e.g. 7"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
            <input
              {...register("isCaptain")}
              type="checkbox"
              className="w-4 h-4 accent-green-500"
            />
            <p className="text-white text-sm font-medium flex items-center gap-1.5">
              <Crown size={14} className="text-yellow-400" />
              Set as Captain
            </p>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const TeamDetailPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data, isLoading, error } = useQuery<TeamData>({
    queryKey: ["team", teamId],
    queryFn: () => teamService.getById(teamId!),
    enabled: !!teamId,
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      teamMemberService.deleteMember(teamId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast.success("Player removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove player");
    },
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState />;

  const { team, members } = data;

  // ✅ string comparison — no Number()
  const isOwner =
    isAuthenticated &&
    !!user &&
    String(user.userId) === String(team.created_by_user_id);

  const captain = members.find((m) => m.is_captain);
  const existingMemberIds = members.map((m) => m.user_id);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Back Button ── */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* ── Team Header ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                {team.team_logo ? (
                  <img
                    src={team.team_logo}
                    alt=""
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Users size={24} className="text-white/20" />
                )}
              </div>

              <div>
                <h1 className="text-white text-xl font-semibold">
                  {team.team_name}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">
                  {team.tournament_name}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-white/30 text-xs">
                    {members.length} {members.length === 1 ? "player" : "players"}
                  </span>
                  {captain && (
                    <span className="flex items-center gap-1 text-yellow-400/80 text-xs">
                      <Crown size={11} />
                      {captain.username}
                    </span>
                  )}
                  <span className="text-white/20 text-xs">
                    by {team.created_by_username}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner — Add Player */}
            {isOwner && (
              <button
                onClick={() => setShowAddPlayer(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={15} />
                Add Player
              </button>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/[0.06]">
            {[
              { label: "Players",  value: members.length },
              { label: "Captain",  value: captain ? captain.username : "—" },
              { label: "Tournament", value: team.tournament_name },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-sm truncate">{s.value}</p>
                <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Players List ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-white font-semibold">Players</h2>
          </div>

          {members.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Users size={28} className="text-white/10" />
              <p className="text-white/25 text-sm">No players yet</p>
              {isOwner && (
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors mt-1"
                >
                  <Plus size={14} />
                  Add First Player
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {members.map((m, i) => (
                <div
                  key={m.team_member_id}
                  className={`px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors
                    ${m.is_captain ? "bg-yellow-500/[0.03]" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${m.is_captain
                      ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                      : "bg-white/[0.05] text-white/40 border border-white/[0.07]"}`}>
                    {m.profile_image ? (
                      <img
                        src={m.profile_image}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      m.username.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">
                        {m.username}
                      </p>
                      {m.is_captain && (
                        <span className="flex items-center gap-1 text-yellow-400 text-[10px] font-semibold bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                          <Crown size={9} />
                          Captain
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/30 text-xs">{m.role}</span>
                      {m.jersey_number && (
                        <span className="text-white/20 text-xs">
                          #{m.jersey_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner Actions */}
                  {isOwner && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setEditingMember(m)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      {!m.is_captain && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${m.username} from team?`)) {
                              deleteMemberMutation.mutate(m.user_id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ── */}
      {showAddPlayer && (
        <AddPlayerModal
          teamId={teamId!}
          tournamentId={team.tournament_id}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowAddPlayer(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["team", teamId] })
          }
        />
      )}

      {editingMember && (
        <EditMemberModal
          teamId={teamId!}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["team", teamId] })
          }
        />
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/20 text-sm animate-pulse">Loading...</div>
  </div>
);

const ErrorState = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/30 text-sm">Team not found</div>
  </div>
);

export default TeamDetailPage;