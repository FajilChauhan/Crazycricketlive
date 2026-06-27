import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Mail, Trophy, Activity,
  Target, Zap, Calendar, MapPin, Edit2, Check, X, Camera
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import { profileService } from "../services/profile.service";
import { useAppSelector } from "../hooks/useAppSelector";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { setUser } from "../features/auth/authSlice";
import type { UserStats, UserTournament, UserMatch } from "../features/profile/profile.types";

type Tab = "overview" | "tournaments" | "matches";

const editSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
});
type EditForm = z.infer<typeof editSchema>;

// ── status badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live:      "bg-red-500/15 text-red-400 border-red-500/25",
    ongoing:   "bg-green-500/15 text-green-400 border-green-500/25",
    completed: "bg-white/5 text-white/40 border-white/10",
    upcoming:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
    scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-2 py-0.5 ${map[status] ?? map.completed}`}>
      {status === "live" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 mb-0.5" />
      )}
      {status}
    </span>
  );
};

// ── empty state ───────────────────────────────────────────────────
const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl py-16 flex flex-col items-center gap-3">
    <div className="text-white/15">{icon}</div>
    <p className="text-white/25 text-sm">{text}</p>
  </div>
);

// ── main component ────────────────────────────────────────────────
const ProfilePage = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  

  // ── queries ──────────────────────────────────────────────────
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: profileService.getMyProfile,
    enabled: !!authUser,
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["profile-stats"],
    queryFn: profileService.getMyStats,
    enabled: !!authUser,
  });

  const { data: tournaments = [] } = useQuery<UserTournament[]>({
    queryKey: ["profile-tournaments"],
    queryFn:  profileService.getMyTournaments,
    enabled: !!authUser && tab === "tournaments",
  });

  const { data: matches = [] } = useQuery<UserMatch[]>({
    queryKey: ["profile-matches"],
    queryFn:  profileService.getMyMatches,
    enabled: !!authUser && tab === "matches",
  });

  // ── edit form ────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { username: profile?.username ?? authUser?.username ?? "" },
  });

  const onEditSubmit = async (data: EditForm) => {
    try {
      const payload = new FormData();
      if (data.username) payload.append("username", data.username);
      if (profileImage) payload.append("profileImage", profileImage);

      const updated = await profileService.updateMyProfile(payload as any);
      dispatch(setUser({ ...authUser!, username: updated.username }));
      await refetchProfile();
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const displayName = profile?.username ?? authUser?.username ?? "—";
  const initials = displayName !== "—" ? displayName.slice(0, 2).toUpperCase() : "?";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview",    label: "Overview",    icon: <Activity size={15} /> },
    { key: "tournaments", label: "Tournaments", icon: <Trophy size={15} /> },
    { key: "matches",     label: "Matches",     icon: <Target size={15} /> },
  ];

  useEffect(() => {
    if (profile?.username) {
      reset({
        username: profile.username,
      });
    }
    if (profile?.profileImage) {
      setPreviewUrl(profile.profileImage);
    }
  }, [profile, reset]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── profile card ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div 
                className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 mx-auto sm:mx-0 overflow-hidden group"
                onClick={() => editing && fileInputRef.current?.click()}
                style={{ cursor: editing ? 'pointer' : 'default' }}
              >
                {previewUrl || profile?.profileImage ? (
                  <img src={previewUrl || profile?.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                {editing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white" />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <div className="flex flex-col items-center sm:items-start">
                {editing ? (
                  <form onSubmit={handleSubmit(onEditSubmit)} className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <input
                      {...register("username")}
                      autoFocus
                      className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500/50"
                    />
                    <button type="submit" disabled={isSubmitting}
                      className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                      <Check size={14} />
                    </button>
                    <button type="button" onClick={() => { setEditing(false); reset(); }}
                      className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10">
                      <X size={14} />
                    </button>
                    {errors.username && (
                      <p className="text-red-400 text-xs w-full text-center sm:text-left">{errors.username.message}</p>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-white text-xl font-semibold">{displayName}</h1>
                    <button onClick={() => setEditing(true)}
                      className="p-1 rounded-md text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                  <Mail size={12} className="text-white/25" />
                  <span className="text-white/40 text-sm">{profile?.email ?? authUser?.email ?? "—"}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <Calendar size={12} className="text-white/25" />
                  <span className="text-white/30 text-xs">
                    Joined{" "}
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-1 font-medium sm:self-start">
              Active
            </span>
          </div>
        </div>

        {/* ── stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Matches",     value: stats?.totalMatches ?? 0,       icon: <Target size={16} />,   color: "text-blue-400" },
            { label: "Runs",        value: stats?.totalRuns ?? 0,          icon: <Zap size={16} />,      color: "text-yellow-400" },
            { label: "Wickets",     value: stats?.totalWickets ?? 0,       icon: <Activity size={16} />, color: "text-red-400" },
            { label: "Tournaments", value: stats?.createdTournaments ?? 0, icon: <Trophy size={16} />,   color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl p-4 text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className="text-white text-xl font-bold">{s.value}</p>
              <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── tabs ── */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/[0.07] rounded-xl p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.key ? "bg-green-500 text-white" : "text-white/40 hover:text-white/70"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── overview ── */}
        {tab === "overview" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Batting</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Total Runs</span>
                  <span className="text-yellow-400 font-semibold">{stats?.totalRuns ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Matches</span>
                  <span className="text-white font-semibold">{stats?.totalMatches ?? 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Bowling</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Total Wickets</span>
                  <span className="text-red-400 font-semibold">{stats?.totalWickets ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Matches</span>
                  <span className="text-white font-semibold">{stats?.totalMatches ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── tournaments ── */}
        {tab === "tournaments" && (
          <div className="space-y-3">
            {tournaments.length === 0 ? (
              <EmptyState icon={<Trophy size={28} />} text="No tournaments created yet" />
            ) : tournaments.map((t: any) => (
              <div key={t.tournament_id}
                onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-white/20 hover:bg-[#1f1f1f] transition-all cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Trophy size={15} className="text-green-500/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{t.tournament_name}</p>
                    <p className="text-white/35 text-sm truncate">{t.organization_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── matches ── */}
        {tab === "matches" && (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <EmptyState icon={<Target size={28} />} text="No match history yet" />
            ) : matches.map((m: any) => (
              <div key={m.match_id}
                onClick={() => navigate(`/matches/${m.match_id}`)}
                className="bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-white/15 hover:bg-[#1f1f1f] transition-all cursor-pointer">
                <div>
                  <p className="text-white font-medium">
                    {m.team1_name} <span className="text-white/25">vs</span> {m.team2_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <MapPin size={11} /> {m.ground_name}
                    </span>
                    <span className="text-white/20 text-xs">{m.match_type} · {m.overs} ov</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={m.status} />
                  <span className="text-white/20 text-xs">#{m.match_no}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePage;