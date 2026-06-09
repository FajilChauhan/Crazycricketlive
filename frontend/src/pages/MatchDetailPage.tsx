// pages/MatchDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Clock, Users, TrendingUp,
  History, BarChart3, Zap, ChevronDown, X,
  Crown, Shield, Trash2, UserPlus, Play,
  Trophy, Star
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { matchService } from "../services/match.service";
import { teamMemberService } from "../services/teamMember.service";
import { userService } from "../services/user.service";
import { useAppSelector } from "../hooks/useAppSelector";
import { useMatchSocket } from "../hooks/useMatchSocket";

type Tab = "summary" | "scorecard" | "history" | "permissions";

// ── helpers ───────────────────────────────────────────────────────
const fmt = (d?: string) => {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const oversStr = (balls: number) =>
  `${Math.floor(balls / 6)}.${balls % 6}`;

// ── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    live:      "bg-red-500/15 text-red-400 border-red-500/25",
    completed: "bg-white/5 text-white/35 border-white/10",
    scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/20",
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

// ── Ball Tag ──────────────────────────────────────────────────────
const BallTag = ({ ball }: { ball: any }) => {
  let cls = "bg-white/5 text-white/50 border-white/10";
  let label = String(ball.runs_scored);
  if (ball.is_wicket) { cls = "bg-red-500/20 text-red-400 border-red-500/30"; label = "W"; }
  else if (ball.extra_type === "wide") { cls = "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"; label = "Wd"; }
  else if (ball.extra_type === "no_ball") { cls = "bg-orange-500/15 text-orange-400 border-orange-500/20"; label = "Nb"; }
  else if (ball.runs_scored === 4) cls = "bg-blue-500/15 text-blue-400 border-blue-500/20";
  else if (ball.runs_scored === 6) cls = "bg-green-500/20 text-green-400 border-green-500/25";
  return (
    <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

// ── Innings Card ──────────────────────────────────────────────────
const InningsCard = ({ innings }: { innings: any }) => (
  <div className="bg-[#1f1f1f] border border-white/[0.07] rounded-xl p-5">
    <div className="flex items-center justify-between mb-2">
      <div>
        <p className="text-white font-semibold">{innings.batting_team_name}</p>
        <p className="text-white/30 text-xs">Innings {innings.innings_no}</p>
      </div>
      {innings.is_completed && (
        <span className="text-[10px] bg-white/5 text-white/30 border border-white/10 rounded px-2 py-0.5 font-semibold uppercase">
          Completed
        </span>
      )}
    </div>
    <div className="flex items-end gap-2 mt-2">
      <span className="text-white text-3xl font-bold">
        {innings.runs}/{innings.wickets}
      </span>
      <span className="text-white/40 text-sm mb-1">
        ({oversStr(innings.balls_bowled)} ov)
      </span>
    </div>
    {innings.target_runs && !innings.is_completed && (
      <p className="text-yellow-400 text-sm mt-2">
        Need {innings.target_runs - innings.runs} runs
      </p>
    )}
    <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.05]">
      {[
        { l: "4s", v: innings.fours },
        { l: "6s", v: innings.sixes },
        { l: "Extras", v: innings.extras },
      ].map((s) => (
        <span key={s.l} className="text-white/30 text-xs">
          {s.l}: <span className="text-white">{s.v}</span>
        </span>
      ))}
    </div>
  </div>
);

// ── Toss Modal ────────────────────────────────────────────────────
const TossModal = ({
  matchId, team1Id, team2Id, team1Name, team2Name, onClose, onSuccess,
}: any) => {
  const schema = z.object({
    tossWinnerTeamId: z.string().min(1, "Select winner"),
    tossDecision: z.enum(["bat", "bowl"]),
  });
  type F = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { tossDecision: "bat" },
  });
  const mutation = useMutation({
    mutationFn: (d: F) => matchService.updateToss(matchId, d),
    onSuccess: () => { toast.success("Toss saved!"); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Toss Result</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Toss Winner</label>
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <select {...register("tossWinnerTeamId")}
                className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50">
                <option value="">Select winner...</option>
                <option value={team1Id}>{team1Name}</option>
                <option value={team2Id}>{team2Name}</option>
              </select>
            </div>
            {errors.tossWinnerTeamId && (
              <p className="text-red-400 text-xs mt-1">{errors.tossWinnerTeamId.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              {["bat", "bowl"].map((d) => (
                <label key={d} className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-white/[0.08] cursor-pointer hover:border-green-500/30 transition-all">
                  <input {...register("tossDecision")} type="radio" value={d} className="accent-green-500" />
                  <span className="text-white text-sm capitalize font-medium">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save Toss"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Start Innings Modal ───────────────────────────────────────────
const StartInningsModal = ({
  matchId, team1Id, team2Id, team1Name, team2Name,
  inningsNo, firstBattingTeamId, onClose, onSuccess,
}: {
  matchId: string;
  team1Id: string; team2Id: string;
  team1Name: string; team2Name: string;
  inningsNo: number;
  firstBattingTeamId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const getBattingTeam = () => {
    if (inningsNo === 1 && firstBattingTeamId) return firstBattingTeamId;
    if (inningsNo === 2 && firstBattingTeamId) {
      return firstBattingTeamId === team1Id ? team2Id : team1Id;
    }
    return team1Id;
  };

  const battingTeamId  = getBattingTeam();
  const bowlingTeamId  = battingTeamId === team1Id ? team2Id : team1Id;
  const battingName    = battingTeamId === team1Id ? team1Name : team2Name;
  const bowlingName    = bowlingTeamId === team1Id ? team1Name : team2Name;

  const mutation = useMutation({
    mutationFn: () =>
      matchService.startInnings(matchId, {
        inningsNo,
        battingTeamId,
        bowlingTeamId,
      }),
    onSuccess: () => {
      toast.success(`Innings ${inningsNo} started!`);
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            Start Innings {inningsNo}
          </h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400/60 text-xs font-semibold uppercase tracking-wider mb-1">Batting</p>
            <p className="text-white font-semibold">{battingName}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Bowling</p>
            <p className="text-white font-semibold">{bowlingName}</p>
          </div>
          {firstBattingTeamId && (
            <p className="text-white/25 text-xs text-center">
              ✓ Teams set automatically from toss result
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50">
            {mutation.isPending ? "Starting..." : "Start Innings"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Update Status Modal ───────────────────────────────────────────
const TERMINAL_STATUSES = new Set(["completed", "abandoned", "cancelled"]);

const UpdateStatusModal = ({ matchId, currentStatus, onClose, onSuccess }: any) => {
  const schema = z.object({
    status: z.enum(["upcoming", "live", "completed", "abandoned", "cancelled"]),
  });
  type F = z.infer<typeof schema>;
  const { register, handleSubmit } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { status: currentStatus },
  });

  const isTerminal = TERMINAL_STATUSES.has(currentStatus);

  const mutation = useMutation({
    mutationFn: (d: F) => matchService.updateStatus(matchId, d),
    onSuccess: () => { toast.success("Status updated!"); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Update Status</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18} /></button>
        </div>

        {isTerminal ? (
          <div className="mb-5 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-400 text-sm font-medium">
              ⚠️ Match is <span className="font-bold uppercase">{currentStatus}</span>
            </p>
            <p className="text-orange-400/60 text-xs mt-1">
              Status cannot be changed back to Upcoming or Live.
              You can only mark it as Abandoned or Cancelled.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="relative">
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <select {...register("status")}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50">
              {!isTerminal && <option value="upcoming">Upcoming</option>}
              {!isTerminal && <option value="live">Live</option>}
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50">
              {mutation.isPending ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ── Player Row ────────────────────────────────────────────────────
const PlayerRow = ({ player, onClick }: { player: any; onClick: () => void }) => (
  <div onClick={onClick}
    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors">
    <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-[10px] text-white/40 font-bold flex-shrink-0">
      {player.profile_image
        ? <img src={player.profile_image} alt="" className="w-full h-full object-cover rounded-lg" />
        : (player.username ?? "?").slice(0, 2).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-white/80 text-sm truncate">{player.username}</p>
        {player.is_captain && <Crown size={10} className="text-yellow-400 flex-shrink-0" />}
      </div>
      {player.role && <p className="text-white/25 text-xs">{player.role}</p>}
    </div>
    {player.batting_order && (
      <span className="text-white/20 text-xs">#{player.batting_order}</span>
    )}
  </div>
);

// ── Per-Innings Scorecard ─────────────────────────────────────────
const InningsScorecardSection = ({
  innings, matchId, navigate,
}: {
  innings: any;
  matchId: string;
  navigate: (path: string) => void;
}) => {
  const { data: battingData = [], isLoading: battingLoading } = useQuery({
    queryKey: ["batting", matchId, innings.innings_id],
    queryFn: () => matchService.getBattingScorecard(matchId, innings.innings_id),
    enabled: !!matchId && !!innings.innings_id,
  });

  const { data: bowlingData = [], isLoading: bowlingLoading } = useQuery({
    queryKey: ["bowling", matchId, innings.innings_id],
    queryFn: () => matchService.getBowlingScorecard(matchId, innings.innings_id),
    enabled: !!matchId && !!innings.innings_id,
  });

  return (
    <div className="space-y-4">
      {/* Innings Header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07]">
          <span className="text-white/50 text-xs font-semibold">
            Innings {innings.innings_no} — {innings.batting_team_name}
          </span>
          <span className="text-white/25 text-xs">
            {innings.runs}/{innings.wickets} ({oversStr(innings.balls_bowled)} ov)
          </span>
        </div>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* Batting Table */}
      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
          <h3 className="text-white font-semibold text-sm">
            {innings.batting_team_name} — Batting
          </h3>
        </div>
        {battingLoading ? (
          <div className="py-8 text-center text-white/20 text-sm animate-pulse">Loading...</div>
        ) : (battingData as any[]).length === 0 ? (
          <div className="py-8 text-center text-white/20 text-sm">No batting data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Batter", "R", "B", "4s", "6s", "SR"].map((h) => (
                    <th key={h} className="px-4 py-3 text-white/30 text-xs font-medium text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(battingData as any[]).map((b: any) => (
                  <tr key={b.user_id}
                    onClick={() => navigate(`/players/${b.user_id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{b.username}</p>
                      {b.is_out ? (
                        <p className="text-red-400/60 text-[10px]">out</p>
                      ) : (
                        <p className="text-green-400/60 text-[10px]">not out</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{b.runs}</td>
                    <td className="px-4 py-3 text-white/50">{b.balls}</td>
                    <td className="px-4 py-3 text-blue-400">{b.fours}</td>
                    <td className="px-4 py-3 text-green-400">{b.sixes}</td>
                    <td className="px-4 py-3 text-white/50">
                      {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Extras & Total */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
          <span className="text-white/30 text-xs">Extras: <span className="text-white/50">{innings.extras ?? 0}</span></span>
          <span className="text-white/50 text-xs font-semibold">
            Total: {innings.runs}/{innings.wickets} ({oversStr(innings.balls_bowled)} ov)
          </span>
        </div>
      </div>

      {/* Bowling Table */}
      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <h3 className="text-white font-semibold text-sm">
            {innings.bowling_team_name} — Bowling
          </h3>
        </div>
        {bowlingLoading ? (
          <div className="py-8 text-center text-white/20 text-sm animate-pulse">Loading...</div>
        ) : (bowlingData as any[]).length === 0 ? (
          <div className="py-8 text-center text-white/20 text-sm">No bowling data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Bowler", "O", "R", "W", "Econ"].map((h) => (
                    <th key={h} className="px-4 py-3 text-white/30 text-xs font-medium text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(bowlingData as any[]).map((b: any) => (
                  <tr key={b.user_id}
                    onClick={() => navigate(`/players/${b.user_id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{b.username}</td>
                    <td className="px-4 py-3 text-white/50">{oversStr(b.balls)}</td>
                    <td className="px-4 py-3 text-white/50">{b.runs_conceded}</td>
                    <td className="px-4 py-3 text-red-400 font-bold">{b.wickets}</td>
                    <td className="px-4 py-3 text-white/50">
                      {b.balls > 0 ? ((b.runs_conceded / b.balls) * 6).toFixed(1) : "0.0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const MatchDetailPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const [tab, setTab] = useState<Tab>("summary");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [showInningsModal, setShowInningsModal] = useState(false);

  // Real-time updates via WebSockets
  useMatchSocket(matchId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["match", matchId] });

  // ── ALL hooks must be declared before any early return ────────

  const { data, isLoading, error } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => matchService.getById(matchId!),
    enabled: !!matchId,
  });

  const { data: ballsData } = useQuery({
    queryKey: ["balls", matchId],
    queryFn: () => matchService.getBalls(matchId!),
    enabled: !!matchId && tab === "history",
  });

  // ── Early returns AFTER all hooks ────────────────────────────
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState />;

  const { match, innings = [] } = data;

  const isOwner =
    isAuthenticated &&
    !!user &&
    String(user.userId) === String(match.tournament_created_by_user_id ?? "");


  const team1Players = (data?.players ?? []).filter(
    (p: any) => String(p.team_id) === String(data?.match?.team1_id)
  );

  const team2Players = (data?.players ?? []).filter(
    (p: any) => String(p.team_id) === String(data?.match?.team2_id)
  );

  const currentInnings = innings.find((i: any) => !i.is_completed);
  const nextInningsNo = innings.length + 1;
  const canStartInnings =
    isOwner &&
    match.status === "live" &&
    !currentInnings &&
    innings.length < 2;

  const tabs = [
    { key: "summary",     label: "Summary",     icon: <BarChart3 size={14} /> },
    { key: "scorecard",   label: "Scorecard",   icon: <TrendingUp size={14} /> },
    { key: "history",     label: "History",     icon: <History size={14} /> },
    ...(isOwner
      ? [{ key: "permissions", label: "Permissions", icon: <Shield size={14} /> }]
      : []),
  ];

  // Win margin helper
  const getWinMargin = () => {
    if (innings.length < 2) return "";
    const inn1 = innings[0];
    const inn2 = innings[1];
    if (!inn1 || !inn2) return "";
    if (inn2.runs > inn1.runs) {
      const maxWickets = Math.max(team2Players.length - 1, 10);
      const wicketsLeft = maxWickets - inn2.wickets;
      return wicketsLeft > 0
        ? `Won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`
        : `Won by ${inn2.runs - inn1.runs} run${(inn2.runs - inn1.runs) !== 1 ? "s" : ""}`;
    } else {
      const margin = inn1.runs - inn2.runs;
      return `Won by ${margin} run${margin !== 1 ? "s" : ""}`;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back */}
        <button onClick={() => navigate(`/tournaments/${match.tournament_id}`)}
          className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Tournament
        </button>

        {/* ── Header ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-white text-xl font-semibold">
                  {match.team1_name}
                  <span className="text-white/25 font-normal mx-2">vs</span>
                  {match.team2_name}
                </h1>
                <StatusBadge status={match.status} />
              </div>
              <p className="text-white/35 text-sm">
                Match #{match.match_no} · {match.match_type} · {match.overs} overs
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-white/25 text-xs">
                  <MapPin size={11} /> {match.ground_name}
                </span>
                {match.scheduled_start_at && (
                  <span className="flex items-center gap-1 text-white/25 text-xs">
                    <Clock size={11} /> {fmt(match.scheduled_start_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {isOwner && !match.toss_winner_team_id && (
                <button onClick={() => setShowTossModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/25 text-sm font-medium transition-colors">
                  <Crown size={14} /> Toss
                </button>
              )}
              {isOwner && (
                <button onClick={() => setShowStatusModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white/60 border border-white/[0.07] text-sm font-medium transition-colors">
                  <Zap size={14} /> Status
                </button>
              )}
              {canStartInnings && (
                <button onClick={() => setShowInningsModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 text-sm font-medium transition-colors">
                  <Play size={14} /> Start Innings {nextInningsNo}
                </button>
              )}
              {isOwner && match.status === "live" && currentInnings && (
                <button
                  onClick={() => navigate(`/matches/${matchId}/scoring`)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                  <Zap size={14} /> Live Scoring
                </button>
              )}
            </div>
          </div>

          {/* Toss result */}
          {match.toss_winner_team_id && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
              <Crown size={13} className="text-yellow-400" />
              <p className="text-white/50 text-sm">
                <span className="text-white/80 font-medium">{match.toss_winner_team_name}</span>
                {" "}won the toss and elected to{" "}
                <span className="text-white/80 font-medium">{match.toss_decision}</span>
              </p>
            </div>
          )}

          {/* Winner banner */}
          {match.winner_team_name && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-yellow-500/5 border border-green-500/20">
                <Trophy size={20} className="text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-400 font-bold">
                    🏆 {match.winner_team_name} won the match!
                  </p>
                  <p className="text-green-400/60 text-xs mt-0.5">{getWinMargin()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tied */}
          {match.status === "completed" && !match.winner_team_name && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-400 font-bold text-sm">🤝 Match ended in a Tie</p>
              </div>
            </div>
          )}

          {/* MOTM banner */}
          {(match as any).man_of_the_match_user_id && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
              <Star size={13} className="text-yellow-400" />
              <p className="text-yellow-400/80 text-sm">
                Man of the Match: <span className="font-semibold text-yellow-400">{(match as any).man_of_match_username ?? "—"}</span>
              </p>
            </div>
          )}

          {/* Innings Scores */}
          {innings.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/[0.06]">
              {innings.map((inn: any) => (
                <InningsCard key={inn.innings_id} innings={inn} />
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/[0.07] rounded-xl p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.key ? "bg-green-500 text-white" : "text-white/40 hover:text-white/70"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Summary Tab ── */}
        {tab === "summary" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  teamId: match.team1_id,
                  name: match.team1_name,
                  players: team1Players,
                  color: "blue",
                },
                {
                  teamId: match.team2_id,
                  name: match.team2_name,
                  players: team2Players,
                  color: "orange",
                },
              ].map((t) => (
                <div key={t.teamId}
                  className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                      ${t.color === "blue"
                        ? "bg-blue-500/15 border border-blue-500/25"
                        : "bg-orange-500/15 border border-orange-500/25"}`}>
                      <Users size={15} className={t.color === "blue" ? "text-blue-400" : "text-orange-400"} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-white/30 text-xs">{(t.players as any[]).length} players</p>
                    </div>
                  </div>
                  {(t.players as any[]).length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-4">
                      No playing XI set yet
                    </p>
                  ) : (
                    <div>
                      {(t.players as any[]).map((p: any) => (
                        <PlayerRow
                          key={p.userId ?? p.user_id}
                          player={p}
                          onClick={() => navigate(`/players/${p.userId ?? p.user_id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Match Info */}
            <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Match Info</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Type",     value: match.match_type },
                  { label: "Overs",    value: match.overs },
                  { label: "Ground",   value: match.ground_name },
                  { label: "Match No", value: `#${match.match_no}` },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-white/30 text-xs mb-1">{s.label}</p>
                    <p className="text-white text-sm capitalize">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Scorecard Tab (per innings, Cricbuzz style) ── */}
        {tab === "scorecard" && (
          <div className="space-y-8">
            {innings.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl py-16 text-center text-white/20 text-sm">
                No innings played yet
              </div>
            ) : (
              innings.map((inn: any) => (
                <InningsScorecardSection
                  key={inn.innings_id}
                  innings={inn}
                  matchId={matchId!}
                  navigate={navigate}
                />
              ))
            )}
          </div>
        )}

        {/* ── History Tab (grouped by innings → over) ── */}
        {tab === "history" && (
          <div className="space-y-6">
            {!ballsData || (ballsData as any[]).length === 0 ? (
              <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl py-12 text-center text-white/20 text-sm">
                No balls recorded yet
              </div>
            ) : (
              (() => {
                // Group by innings
                const inningsIds = Array.from(new Set((ballsData as any[]).map((b: any) => b.innings_id)));
                return inningsIds.map((inningsId: any) => {
                  const inningsObj = innings.find((i: any) => i.innings_id === inningsId);
                  const inningsBalls = (ballsData as any[]).filter((b: any) => b.innings_id === inningsId);
                  const overNumbers = Array.from(new Set(inningsBalls.map((b: any) => b.over_number)));

                  return (
                    <div key={inningsId} className="space-y-4">
                      {/* Innings Header */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                          <span className="text-green-400 text-xs font-semibold">
                            {inningsObj
                              ? `Innings ${inningsObj.innings_no} — ${inningsObj.batting_team_name} batting`
                              : `Innings`}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                      </div>

                      {/* Overs for this innings */}
                      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5 space-y-5">
                        {overNumbers.map((overNum: any) => {
                          const overBalls = inningsBalls.filter((b: any) => b.over_number === overNum);
                          const totalRuns = overBalls.reduce(
                            (s: number, b: any) => s + b.runs_scored + b.extra_runs, 0
                          );
                          const wickets = overBalls.filter((b: any) => b.is_wicket).length;
                          return (
                            <div key={overNum}>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
                                  Over {Number(overNum)}
                                </p>
                                <div className="flex items-center gap-3">
                                  {wickets > 0 && (
                                    <p className="text-red-400/70 text-xs">{wickets}W</p>
                                  )}
                                  <p className="text-white/25 text-xs">{totalRuns} runs</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {overBalls.map((b: any) => (
                                  <BallTag key={b.ball_by_ball_id} ball={b} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showTossModal && (
        <TossModal
          matchId={matchId!}
          team1Id={match.team1_id} team2Id={match.team2_id}
          team1Name={match.team1_name} team2Name={match.team2_name}
          onClose={() => setShowTossModal(false)}
          onSuccess={invalidate}
        />
      )}
      {showStatusModal && (
        <UpdateStatusModal
          matchId={matchId!} currentStatus={match.status}
          onClose={() => setShowStatusModal(false)}
          onSuccess={invalidate}
        />
      )}
      {showInningsModal && (
        <StartInningsModal
          matchId={matchId!}
          team1Id={match.team1_id}
          team2Id={match.team2_id}
          team1Name={match.team1_name}
          team2Name={match.team2_name}
          inningsNo={nextInningsNo}
          firstBattingTeamId={match.first_batting_team_id}
          onClose={() => setShowInningsModal(false)}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
};

const PageLoader = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/20 text-sm animate-pulse">Loading...</div>
  </div>
);

const ErrorState = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/30 text-sm">Match not found</div>
  </div>
);

export default MatchDetailPage;