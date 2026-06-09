// pages/LiveScoringPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowLeftRight, ChevronDown,
  Check, AlertCircle, RotateCcw, Save, Trophy, X, Star
} from "lucide-react";
import toast from "react-hot-toast";
import { matchService } from "../services/match.service";
import { useMatchSocket } from "../hooks/useMatchSocket";

interface TeamMember {
  team_member_id: string;
  team_id: string;
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  is_captain: boolean;
  role: string;
  jersey_number: number | null;
}

type ExtraType = "wide" | "no_ball" | "bye" | "leg_bye";
type WicketType = "bowled" | "caught" | "lbw" | "run_out" | "stumped" | "hit_wicket";
type Phase = "setup" | "scoring" | "over-end" | "new-batsman" | "innings-end" | "match-end";

const oversStr = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

const WICKET_TYPES: WicketType[] = [
  "bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket",
];

const EXTRA_TYPES = [
  { v: "wide" as ExtraType,    short: "Wd", label: "Wide",    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/15" },
  { v: "no_ball" as ExtraType, short: "Nb", label: "No Ball", color: "text-orange-400 border-orange-500/30 bg-orange-500/15" },
  { v: "bye" as ExtraType,     short: "B",  label: "Bye",     color: "text-blue-400 border-blue-500/30 bg-blue-500/15" },
  { v: "leg_bye" as ExtraType, short: "LB", label: "Leg Bye", color: "text-purple-400 border-purple-500/30 bg-purple-500/15" },
];

// ── Ball Tag ──────────────────────────────────────────────────────
const BallTag = ({ ball }: { ball: any }) => {
  let cls = "bg-white/5 text-white/50 border-white/10";
  let label = String(ball.runs_scored ?? 0);
  if (ball.is_wicket) { cls = "bg-red-500/20 text-red-400 border-red-500/30"; label = "W"; }
  else if (ball.extra_type === "wide") { cls = "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"; label = "Wd"; }
  else if (ball.extra_type === "no_ball") { cls = "bg-orange-500/15 text-orange-400 border-orange-500/20"; label = "Nb"; }
  else if (ball.runs_scored === 4) cls = "bg-blue-500/15 text-blue-400 border-blue-500/20";
  else if (ball.runs_scored === 6) cls = "bg-green-500/20 text-green-400 border-green-500/25";
  return (
    <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
};

const BallPreview = ({ runs, extra, isWicket }: { runs: number | null; extra: ExtraType | null; isWicket: boolean }) => {
  if (runs === null && !extra && !isWicket) return null;
  let cls = "bg-white/5 text-white/50 border-white/10";
  let label = runs !== null ? String(runs) : "?";
  if (isWicket) { cls = "bg-red-500/20 text-red-400 border-red-500/30"; label = runs !== null ? `${runs}W` : "W"; }
  else if (extra === "wide") { cls = "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"; label = `${runs ?? 0}Wd`; }
  else if (extra === "no_ball") { cls = "bg-orange-500/15 text-orange-400 border-orange-500/20"; label = `${runs ?? 0}Nb`; }
  else if (runs === 4) cls = "bg-blue-500/15 text-blue-400 border-blue-500/20";
  else if (runs === 6) cls = "bg-green-500/20 text-green-400 border-green-500/25";
  return (
    <span className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center text-sm font-bold ${cls} animate-pulse`}>
      {label}
    </span>
  );
};

const Avatar = ({ name }: { name: string }) => (
  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[11px] font-bold text-white/40 flex-shrink-0">
    {name?.slice(0, 2).toUpperCase() ?? "??"}
  </div>
);

// ── Match End Modal ────────────────────────────────────────────────
const MatchEndModal = ({
  matchId, innings, match, allPlayers, onClose, onDone,
}: {
  matchId: string;
  innings: any[];
  match: any;
  allPlayers: TeamMember[];
  onClose: () => void;
  onDone: () => void;
}) => {
  const [motmId, setMotmId] = useState("");
  const [saving, setSaving] = useState(false);

  const inn1 = innings[0];
  const inn2 = innings[1];

  const winnerTeamName = match?.winner_team_name ?? null;
  const isTie = match?.status === "completed" && !winnerTeamName;

  const getWinDesc = () => {
    if (!inn1 || !inn2) return "";
    if (isTie) return "Match tied!";
    if (match.winner_team_id === inn2?.batting_team_id) {
      const allBatters = allPlayers.filter(
        (p: any) => String(p.team_id) === String(inn2.batting_team_id)
      );
      const wicketsLeft = Math.max(
        0,
        (allBatters.length > 1 ? allBatters.length - 1 : 10) - (inn2.wickets ?? 0)
      );
      return wicketsLeft > 0
        ? `Won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`
        : "Won";
    }
    const margin = (inn1?.runs ?? 0) - (inn2?.runs ?? 0);
    return margin > 0 ? `Won by ${margin} run${margin !== 1 ? "s" : ""}` : "Won";
  };

  const saveMOTM = async () => {
    if (!motmId) { onDone(); return; }
    setSaving(true);
    try {
      await matchService.declareWinner(matchId, {
        winnerTeamId: match.winner_team_id ?? "",
        winType: isTie ? "tie" : "runs",
        manOfTheMatchUserId: motmId,
      });
    } catch (_) {}
    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md my-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">Match Complete</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 text-center py-4 px-4 rounded-xl bg-green-500/8 border border-green-500/15">
          <Trophy size={32} className="text-green-400 mx-auto mb-2" />
          {isTie ? (
            <p className="text-yellow-400 font-bold text-lg">⚡ Match Tied!</p>
          ) : winnerTeamName ? (
            <>
              <p className="text-green-400 font-bold text-lg">🏆 {winnerTeamName} won!</p>
              <p className="text-green-400/60 text-sm mt-1">{getWinDesc()}</p>
            </>
          ) : (
            <p className="text-white/40 text-sm">Match Complete</p>
          )}

          {inn1 && inn2 && (
            <p className="text-white/30 text-xs mt-3">
              {inn1.batting_team_name}: {inn1.runs}/{inn1.wickets} ({oversStr(inn1.balls_bowled)} ov)
              {" vs "}
              {inn2.batting_team_name}: {inn2.runs}/{inn2.wickets} ({oversStr(inn2.balls_bowled)} ov)
            </p>
          )}
        </div>

        {allPlayers.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Star size={13} className="text-yellow-400" />
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                Man of the Match
              </p>
              <span className="text-white/20 text-xs">(optional)</span>
            </div>
            <div className="relative">
              <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <select
                value={motmId}
                onChange={(e) => setMotmId(e.target.value)}
                className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/40"
              >
                <option value="">Select player...</option>
                {allPlayers.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.username}{p.is_captain ? " ©" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onDone} className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm">
            Skip
          </button>
          <button
            onClick={saveMOTM}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors">
            {saving ? "Saving..." : motmId ? "Save & Close" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Setup Screen ──────────────────────────────────────────────────
const SetupScreen = ({
  innings, battingPlayers, bowlingPlayers, is1v1,
  autoFilledBattingTeamName, onStart,
}: {
  innings: any;
  battingPlayers: TeamMember[];
  bowlingPlayers: TeamMember[];
  is1v1: boolean;
  autoFilledBattingTeamName?: string;
  onStart: (striker: string, nonStriker: string, bowler: string) => void;
}) => {
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");
  const canStart = !!striker && !!bowler && (is1v1 || !!nonStriker);

  return (
    <div className="min-h-screen bg-[#111] px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">
              Innings {innings.innings_no} Setup
            </span>
          </div>
          <h1 className="text-white text-2xl font-bold">{innings.batting_team_name}</h1>
          {autoFilledBattingTeamName}
          <p className="text-white/35 text-sm mt-1">Select players to start scoring</p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5 space-y-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">⚔️ Batting — {innings.batting_team_name}</p>
          <div>
            <label className="block text-white/50 text-xs mb-1.5">
              {is1v1 ? "Batsman" : "Opening Striker"}
            </label>
            <div className="relative">
              <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <select value={striker} onChange={(e) => setStriker(e.target.value)}
                className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40">
                <option value="">Select {is1v1 ? "batsman" : "striker"}...</option>
                {battingPlayers.filter((p) => p.user_id !== nonStriker).map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.username}{p.is_captain ? " ©" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!is1v1 && (
            <div>
              <label className="block text-white/50 text-xs mb-1.5">Non-Striker</label>
              <div className="relative">
                <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                <select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40">
                  <option value="">Select non-striker...</option>
                  {battingPlayers.filter((p) => p.user_id !== striker).map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.username}{p.is_captain ? " ©" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">🎯 Bowling — {innings.bowling_team_name}</p>
          <div className="relative">
            <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <select value={bowler} onChange={(e) => setBowler(e.target.value)}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40">
              <option value="">Select bowler...</option>
              {bowlingPlayers.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.username}{p.is_captain ? " ©" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {battingPlayers.length === 0 && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-400/70 text-xs">No players added — you can still score without names.</p>
          </div>
        )}

        <button type="button"
          disabled={battingPlayers.length > 0 && !canStart}
          onClick={() => onStart(striker, nonStriker, bowler)}
          className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors">
          Start Scoring →
        </button>
      </div>
    </div>
  );
};

// ── Over End Screen ───────────────────────────────────────────────
const OverEndScreen = ({
  completedOver, overRuns, overBalls, bowlingPlayers, lastBowlerId, onNext,
}: {
  completedOver: number;
  overRuns: number;
  overBalls: any[];
  bowlingPlayers: TeamMember[];
  lastBowlerId: string;
  onNext: (newBowlerId: string) => void;
}) => {
  const [newBowler, setNewBowler] = useState("");
  const others = bowlingPlayers.filter((p) => p.user_id !== lastBowlerId);

  return (
    <div className="min-h-screen bg-[#111] px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">
              Over {completedOver} Complete
            </span>
          </div>
          <p className="text-white/40 text-sm">{overRuns} runs this over</p>
        </div>

        {overBalls.length > 0 && (
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">This over</p>
            <div className="flex gap-2 flex-wrap">
              {overBalls.map((b: any) => <BallTag key={b.ball_by_ball_id} ball={b} />)}
            </div>
          </div>
        )}

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">🎯 Select Next Bowler</p>
          <p className="text-white/25 text-xs mb-4">Same bowler cannot bowl consecutive overs</p>
          {others.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Only one bowler — continuing same</p>
          ) : (
            <div className="space-y-2">
              {others.map((p) => (
                <button key={p.user_id} type="button" onClick={() => setNewBowler(p.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                    ${newBowler === p.user_id
                      ? "bg-green-500/12 border-green-500/30 text-green-400"
                      : "bg-[#111] border-white/[0.07] text-white/55 hover:border-white/20"}`}>
                  <Avatar name={p.username} />
                  <span className="text-sm font-medium flex-1">{p.username}{p.is_captain ? " ©" : ""}</span>
                  {newBowler === p.user_id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => onNext(newBowler || lastBowlerId)}
          className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors">
          {newBowler ? "Start Next Over →" : "Continue Same Bowler →"}
        </button>
      </div>
    </div>
  );
};

// ── New Batsman Screen ────────────────────────────────────────────
const NewBatsmanScreen = ({
  outName, reason, battingPlayers, usedIds, isAllOut,
  onSelect, onAllOut,
}: {
  outName: string;
  reason: "wicket" | "retired_hurt";
  battingPlayers: TeamMember[];
  usedIds: string[];
  isAllOut: boolean;
  onSelect: (id: string) => void;
  onAllOut: () => void;
}) => {
  const [chosen, setChosen] = useState("");
  const available = battingPlayers.filter((p) => !usedIds.includes(p.user_id));

  return (
    <div className="min-h-screen bg-[#111] px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 border
            ${reason === "retired_hurt" ? "bg-orange-500/10 border-orange-500/25" : "bg-red-500/12 border-red-500/25"}`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${reason === "retired_hurt" ? "text-orange-400" : "text-red-400"}`}>
              {reason === "retired_hurt" ? "Retired Hurt" : "Wicket!"}
            </span>
          </div>
          <h2 className="text-white text-xl font-bold">
            {outName} {reason === "retired_hurt" ? "retired hurt" : "is out"}
          </h2>
          <p className="text-white/35 text-sm mt-1">
            {isAllOut ? "All Out!" : "Select next batsman"}
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
          {isAllOut ? (
            <div className="py-6 text-center">
              <p className="text-red-400 font-semibold text-lg">All Out!</p>
              <p className="text-white/30 text-sm mt-1">No more batsmen available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {available.map((p) => (
                <button key={p.user_id} type="button" onClick={() => setChosen(p.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                    ${chosen === p.user_id
                      ? "bg-green-500/12 border-green-500/30 text-green-400"
                      : "bg-[#111] border-white/[0.07] text-white/55 hover:border-white/20"}`}>
                  <Avatar name={p.username} />
                  <span className="text-sm font-medium flex-1">
                    {p.username}{p.is_captain ? " ©" : ""}
                  </span>
                  {chosen === p.user_id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {isAllOut ? (
          <button type="button" onClick={onAllOut}
            className="w-full py-3.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-semibold text-sm transition-colors">
            End Innings →
          </button>
        ) : (
          <button type="button" onClick={() => chosen && onSelect(chosen)}
            disabled={!chosen}
            className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors">
            {chosen ? "Continue →" : "Select a batsman"}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const LiveScoringPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Real-time updates via WebSockets
  useMatchSocket(matchId);

  const [pendingRuns, setPendingRuns] = useState<number | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<ExtraType | null>(null);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>("bowled");
  const [showMatchEnd, setShowMatchEnd] = useState(false);
  const [showRunOutPicker, setShowRunOutPicker] = useState(false);
  const [freshMatchData, setFreshMatchData] = useState<any>(null);

  // ── Scoring state — all from API ──────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");
  const [outBatsmanId, setOutBatsmanId] = useState("");
  const [retiredIds, setRetiredIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);   // all dismissed this innings
  const [newBatsmanReason, setNewBatsmanReason] = useState<"wicket" | "retired_hurt">("wicket");
  const [wicketWasLastBall, setWicketWasLastBall] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);

  // ── Queries ───────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => matchService.getById(matchId!),
    enabled: !!matchId,
  });

  const { data: ballsData = [], refetch: refetchBalls } = useQuery({
    queryKey: ["balls", matchId],
    queryFn: () => matchService.getBalls(matchId!),
    enabled: !!matchId,
  });

  // ── Fetch scoring state from API on mount ────────────────────
  const { data: scoringStateData, isLoading: stateLoading } = useQuery({
    queryKey: ["scoring-state", matchId],
    queryFn: () => matchService.getScoringState(matchId!),
    enabled: !!matchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // ── Restore state from API once loaded ───────────────────────
useEffect(() => {
  if (stateLoaded || stateLoading) return;

  // scoringStateData IS the state object directly (service already unwraps .state)
  const saved = scoringStateData;

  if (saved && saved.phase) {
    if (saved.phase)                setPhase(saved.phase as Phase);
    if (saved.striker_id)           setStrikerId(saved.striker_id);
    if (saved.non_striker_id)       setNonStrikerId(saved.non_striker_id);
    if (saved.bowler_id)            setBowlerId(saved.bowler_id);
    if (saved.out_batsman_id)       setOutBatsmanId(saved.out_batsman_id);
    if (saved.retired_ids?.length)  setRetiredIds(saved.retired_ids);
    if (saved.dismissed_ids?.length) setDismissedIds(saved.dismissed_ids);
    if (saved.new_batsman_reason)   setNewBatsmanReason(saved.new_batsman_reason);
    if (saved.wicket_was_last_ball) setWicketWasLastBall(saved.wicket_was_last_ball);
  } else {
    // No saved state — check if scoring already started from balls
    if ((data?.innings?.find((i: any) => !i.is_completed)?.balls_bowled ?? 0) > 0) {
      setPhase("scoring");
    }
  }
  setStateLoaded(true);
}, [scoringStateData, stateLoading, stateLoaded, data]);

  const match = data?.match;
  const matchPlayers = (data?.players ?? []) as TeamMember[];
  const team1Members = matchPlayers.filter((p) => String(p.team_id) === String(match?.team1_id));
  const team2Members = matchPlayers.filter((p) => String(p.team_id) === String(match?.team2_id));
  const innings = (data?.innings ?? []) as any[];
  const currentInnings = innings.find((i: any) => !i.is_completed);
  const is1v1 = match?.match_mode === "1v1";

  const battingPlayers: TeamMember[] =
    currentInnings?.batting_team_id === match?.team1_id ? team1Members : team2Members;
  const bowlingPlayers: TeamMember[] =
    currentInnings?.bowling_team_id === match?.team1_id ? team1Members : team2Members;
  const allPlayers = [...team1Members, ...team2Members];

  const currentBalls = (ballsData as any[]).filter(
    (b: any) => b.innings_id === currentInnings?.innings_id
  );
  const legalBalls = currentInnings?.balls_bowled ?? 0;
  const overNumber = Math.floor(legalBalls / 6);
  const ballInOver = legalBalls % 6;
  const lastSixBalls = currentBalls.slice(-6);
  const currentOverBalls = currentBalls.filter((b: any) => b.over_number === overNumber);

  // ── Save scoring state to API ─────────────────────────────────
  const persistState = useCallback(async (overrides: Partial<{
    phase: Phase;
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
    outBatsmanId: string;
    retiredIds: string[];
    dismissedIds: string[];
    newBatsmanReason: "wicket" | "retired_hurt";
    wicketWasLastBall: boolean;
  }> = {}) => {
    if (!matchId) return;
    try {
      await matchService.saveScoringState(matchId, {
        phase:              overrides.phase              ?? phase,
        strikerId:          overrides.strikerId          ?? strikerId,
        nonStrikerId:       overrides.nonStrikerId        ?? nonStrikerId,
        bowlerId:           overrides.bowlerId            ?? bowlerId,
        outBatsmanId:       overrides.outBatsmanId        ?? outBatsmanId,
        retiredIds:         overrides.retiredIds          ?? retiredIds,
        dismissedIds:       overrides.dismissedIds        ?? dismissedIds,
        newBatsmanReason:   overrides.newBatsmanReason    ?? newBatsmanReason,
        wicketWasLastBall:  overrides.wicketWasLastBall   ?? wicketWasLastBall,
      });
    } catch (_) {}
  }, [matchId, phase, strikerId, nonStrikerId, bowlerId, outBatsmanId, retiredIds, dismissedIds, newBatsmanReason, wicketWasLastBall]);

  const clearState = useCallback(async () => {
    if (!matchId) return;
    try { await matchService.clearScoringState(matchId); } catch (_) {}
  }, [matchId]);

  // ── Auto-declare winner ───────────────────────────────────────
  const autoDeclareWinner = useCallback(async (
    winnerTeamId: string,
    winType: "runs" | "wickets" | "tie",
  ) => {
    try {
      if (winType === "tie") {
        await matchService.declareTie(matchId!);
      } else {
        await matchService.declareWinner(matchId!, { winnerTeamId, winType });
      }
    } catch (_) {}

    const fresh = await queryClient.fetchQuery({
      queryKey: ["match", matchId],
      queryFn: () => matchService.getById(matchId!),
      staleTime: 0,
    });
    queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    setFreshMatchData(fresh);
    setTimeout(() => setShowMatchEnd(true), 300);
  }, [matchId, queryClient]);

  // ── Target chased ─────────────────────────────────────────────
  const checkTargetChased = useCallback(async (freshCurrent: any) => {
    if (!freshCurrent?.target_runs) return false;
    if (freshCurrent.runs >= freshCurrent.target_runs) {
      try {
        await matchService.endInnings(matchId!, freshCurrent.innings_id);
        await clearState();
      } catch (_) {}
      await autoDeclareWinner(freshCurrent.batting_team_id, "wickets");
      return true;
    }
    return false;
  }, [matchId, autoDeclareWinner, clearState]);

  // ── All-out in innings 2 ──────────────────────────────────────
  const checkAllOutInnings2 = useCallback(async (freshCurrent: any, allInnings: any[]) => {
    const innings1 = allInnings.find((i: any) => i.innings_no === 1);
    if (!innings1 || !freshCurrent) return;
    try {
      await matchService.endInnings(matchId!, freshCurrent.innings_id);
      await clearState();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    } catch (_) {}
    if (freshCurrent.runs > innings1.runs) {
      await autoDeclareWinner(freshCurrent.batting_team_id, "wickets");
    } else if (freshCurrent.runs < innings1.runs) {
      await autoDeclareWinner(freshCurrent.bowling_team_id, "runs");
    } else {
      await autoDeclareWinner("", "tie");
    }
  }, [matchId, queryClient, autoDeclareWinner, clearState]);

  // ── Overs done innings 2 ──────────────────────────────────────
  const checkOversDoneInnings2 = useCallback(async (freshCurrent: any, allInnings: any[]) => {
    const innings1 = allInnings.find((i: any) => i.innings_no === 1);
    if (!innings1 || !freshCurrent) return;
    try {
      await matchService.endInnings(matchId!, freshCurrent.innings_id);
      await clearState();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    } catch (_) {}
    if (freshCurrent.runs > innings1.runs) {
      await autoDeclareWinner(freshCurrent.batting_team_id, "wickets");
    } else if (freshCurrent.runs < innings1.runs) {
      await autoDeclareWinner(freshCurrent.bowling_team_id, "runs");
    } else {
      await autoDeclareWinner("", "tie");
    }
  }, [matchId, queryClient, autoDeclareWinner, clearState]);

  // ── Add Ball mutation ─────────────────────────────────────────
  const addBallMutation = useMutation({
    mutationFn: () => {
      if (pendingRuns === null) throw new Error("Select runs first");
      if (!currentInnings)     throw new Error("No active innings");
      if (!bowlerId)    { toast.error("Select a bowler"); throw new Error(); }
      if (!strikerId)   { toast.error(is1v1 ? "Select batsman" : "Select striker"); throw new Error(); }
      if (!is1v1 && !nonStrikerId) { toast.error("Select non-striker"); throw new Error(); }

      const isLegal = !selectedExtra || selectedExtra === "bye" || selectedExtra === "leg_bye";

      return matchService.addBall(matchId!, {
        inningsId:       currentInnings.innings_id,
        overNumber:      overNumber + 1,
        ballInOver:      ballInOver + 1,
        strikerId:       strikerId || undefined,
        nonStrikerId:    is1v1 ? undefined : (nonStrikerId || undefined),
        bowlerId:        bowlerId || undefined,
        runsScored:      pendingRuns,
        extraRuns:       selectedExtra ? 1 : 0,
        extraType:       selectedExtra ?? undefined,
        isWicket,
        wicketType:      isWicket ? wicketType : undefined,
        isLegalDelivery: isLegal,
        commentary:
          isWicket            ? `Wicket! ${wicketType.replace(/_/g, " ")}`
          : pendingRuns === 4 ? "FOUR!"
          : pendingRuns === 6 ? "SIX!"
          : undefined,
      });
    },
    onSuccess: async () => {
      const wasWicket          = isWicket;
      const capturedWicketType = wicketType;
      const capturedStriker    = strikerId;
      const capturedNonStriker = nonStrikerId;
      const runs               = pendingRuns ?? 0;
      const isLegal = !selectedExtra || selectedExtra === "bye" || selectedExtra === "leg_bye";

      setPendingRuns(null);
      setSelectedExtra(null);
      setIsWicket(false);
      setWicketType("bowled");
      refetchBalls();

      const freshData = await queryClient.fetchQuery({
        queryKey: ["match", matchId],
        queryFn: () => matchService.getById(matchId!),
      });

      const allInnings    = (freshData?.innings ?? []) as any[];
      const freshCurrent  = allInnings.find((i: any) => !i.is_completed);
      const isInnings2    = freshCurrent?.innings_no >= 2;
      const maxBalls      = (match?.overs ?? 0) * 6;
      const newLegalBalls = freshCurrent?.balls_bowled ?? 0;

      // ① Target chased
      if (isInnings2 && freshCurrent) {
        const chased = await checkTargetChased(freshCurrent);
        if (chased) return;
      }

      // ② Wicket
      if (wasWicket) {
        const wickets    = freshCurrent?.wickets ?? 0;
        const maxWickets = battingPlayers.length > 1 ? battingPlayers.length - 1 : 10;
        const allOut     = wickets >= maxWickets;
        const overDoneAfterWicket = isLegal && newLegalBalls > 0 && newLegalBalls % 6 === 0;

        // Run-out: need to pick which batsman
        if (capturedWicketType === "run_out" && !is1v1 && capturedNonStriker) {
          setWicketWasLastBall(overDoneAfterWicket);
          setShowRunOutPicker(true);
          return;
        }

        // Normal wicket — striker is out
        const outId = capturedStriker;
        const newDismissedIds = [...dismissedIds, outId].filter(Boolean);

        setOutBatsmanId(outId);
        setDismissedIds(newDismissedIds);
        setStrikerId("");
        setNewBatsmanReason("wicket");
        setWicketWasLastBall(overDoneAfterWicket);

        if (allOut) {
          if (isInnings2) {
            await persistState({
              outBatsmanId: outId,
              dismissedIds: newDismissedIds,
              strikerId: "",
              newBatsmanReason: "wicket",
              wicketWasLastBall: overDoneAfterWicket,
            });
            await checkAllOutInnings2(freshCurrent, allInnings);
          } else {
            const newPhase: Phase = "new-batsman";
            setPhase(newPhase);
            await persistState({
              phase: newPhase,
              outBatsmanId: outId,
              dismissedIds: newDismissedIds,
              strikerId: "",
              newBatsmanReason: "wicket",
              wicketWasLastBall: overDoneAfterWicket,
            });
          }
          return;
        }

        const newPhase: Phase = "new-batsman";
        setPhase(newPhase);
        await persistState({
          phase: newPhase,
          outBatsmanId: outId,
          dismissedIds: newDismissedIds,
          strikerId: "",
          newBatsmanReason: "wicket",
          wicketWasLastBall: overDoneAfterWicket,
        });
        return;
      }

      // ③ Overs complete
      if (isLegal && newLegalBalls >= maxBalls) {
        if (isInnings2) {
          await checkOversDoneInnings2(freshCurrent, allInnings);
        } else {
          try {
            await matchService.endInnings(matchId!, currentInnings.innings_id);
            await clearState();
            queryClient.invalidateQueries({ queryKey: ["match", matchId] });
            toast.success(`Innings complete! ${match?.overs} overs done.`);
            navigate(`/matches/${matchId}`, { replace: true });
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Failed to end innings");
          }
        }
        return;
      }

      // ④ Swap striker on odd runs
      let newStriker = capturedStriker;
      let newNonStriker = capturedNonStriker;
      if (isLegal && runs % 2 !== 0 && capturedNonStriker && !is1v1) {
        newStriker    = capturedNonStriker;
        newNonStriker = capturedStriker;
        setStrikerId(newStriker);
        setNonStrikerId(newNonStriker);
      }

      // ⑤ Over complete
      if (isLegal && newLegalBalls % 6 === 0 && newLegalBalls > 0) {
        setPhase("over-end");
        await persistState({
          phase: "over-end",
          strikerId: newStriker,
          nonStrikerId: newNonStriker,
        });
        return;
      }

      await persistState({
        strikerId: newStriker,
        nonStrikerId: newNonStriker,
      });

      toast.success(
        runs === 4 ? "FOUR! 🏏" : runs === 6 ? "SIX! 🚀" : "Ball saved",
        { duration: 1000 }
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (msg) toast.error(msg);
    },
  });

  const handleSetupDone = async (s: string, ns: string, b: string) => {
    setStrikerId(s);
    setNonStrikerId(ns);
    setBowlerId(b);
    setPhase("scoring");
    await persistState({ phase: "scoring", strikerId: s, nonStrikerId: ns, bowlerId: b });
  };

  const handleOverEnd = async (newBowler: string) => {
    let newStriker    = strikerId;
    let newNonStriker = nonStrikerId;
    if (!is1v1 && nonStrikerId) {
      newStriker    = nonStrikerId;
      newNonStriker = strikerId;
      setStrikerId(newStriker);
      setNonStrikerId(newNonStriker);
    }
    setBowlerId(newBowler);
    setPhase("scoring");
    await persistState({
      phase: "scoring",
      bowlerId: newBowler,
      strikerId: newStriker,
      nonStrikerId: newNonStriker,
    });
  };

  const handleNewBatsman = async (newId: string) => {
    setStrikerId(newId);
    setOutBatsmanId("");

    if (wicketWasLastBall) {
      setWicketWasLastBall(false);
      setPhase("over-end");
      await persistState({
        phase: "over-end",
        strikerId: newId,
        outBatsmanId: "",
        wicketWasLastBall: false,
      });
    } else {
      setPhase("scoring");
      await persistState({
        phase: "scoring",
        strikerId: newId,
        outBatsmanId: "",
        wicketWasLastBall: false,
      });
    }
  };

  const handleRunOutVictimSelect = async (victimId: string) => {
    const capturedStriker    = strikerId;
    const capturedNonStriker = nonStrikerId;
    setShowRunOutPicker(false);

    const newDismissedIds = [...dismissedIds, victimId].filter(Boolean);
    setDismissedIds(newDismissedIds);
    setOutBatsmanId(victimId);
    setNewBatsmanReason("wicket");

    let newStriker    = capturedStriker;
    let newNonStriker = capturedNonStriker;

    if (victimId === capturedStriker) {
      setStrikerId("");
      newStriker = "";
    } else {
      // Non-striker run out — swap so striker comes to face
      setNonStrikerId("");
      newNonStriker = "";
    }

    const nextPhase: Phase = wicketWasLastBall ? "over-end" : "new-batsman";
    setWicketWasLastBall(false);
    setPhase(nextPhase);

    await persistState({
      phase: nextPhase,
      strikerId: newStriker,
      nonStrikerId: newNonStriker,
      outBatsmanId: victimId,
      dismissedIds: newDismissedIds,
      newBatsmanReason: "wicket",
      wicketWasLastBall: false,
    });
  };

  const handleAllOut = async () => {
    try {
      await matchService.endInnings(matchId!, currentInnings.innings_id);
      await clearState();

      const freshData = await queryClient.fetchQuery({
        queryKey: ["match", matchId],
        queryFn: () => matchService.getById(matchId!),
        staleTime: 0,
      });

      const allInnings = (freshData?.innings ?? []) as any[];
      const justEnded  = allInnings.find((i: any) => i.innings_id === currentInnings.innings_id);
      const isInn2     = (justEnded?.innings_no ?? currentInnings.innings_no) >= 2;

      if (isInn2) {
        const innings1 = allInnings.find((i: any) => i.innings_no === 1);
        const innings2 = allInnings.find((i: any) => i.innings_no >= 2);
        if (innings1 && innings2) {
          if (innings2.runs > innings1.runs) {
            await autoDeclareWinner(innings2.batting_team_id, "wickets");
          } else if (innings2.runs < innings1.runs) {
            await autoDeclareWinner(innings2.bowling_team_id, "runs");
          } else {
            await autoDeclareWinner("", "tie");
          }
        } else {
          navigate(`/matches/${matchId}`, { replace: true });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["match", matchId] });
        toast.success("All out! Innings ended.");
        navigate(`/matches/${matchId}`, { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed");
    }
  };

  const handleRetiredHurt = async () => {
    if (!strikerId) return;
    const outId = strikerId;
    const newRetiredIds = [...retiredIds, outId];
    setRetiredIds(newRetiredIds);
    setOutBatsmanId(outId);
    setStrikerId("");
    setNewBatsmanReason("retired_hurt");
    setPhase("new-batsman");
    await persistState({
      phase: "new-batsman",
      strikerId: "",
      outBatsmanId: outId,
      retiredIds: newRetiredIds,
      newBatsmanReason: "retired_hurt",
    });
  };

  // ── Loading guards ────────────────────────────────────────────
  if (isLoading || !match || stateLoading || !stateLoaded) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <p className="text-white/20 animate-pulse text-sm">Loading match...</p>
    </div>
  );

  if (showRunOutPicker) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center px-4">
        <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 bg-orange-500/10 border border-orange-500/25">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Run Out!</span>
            </div>
            <h2 className="text-white text-xl font-bold">Who was run out?</h2>
            <p className="text-white/35 text-sm mt-1">Select the dismissed batsman</p>
          </div>
          <div className="space-y-3">
            {[
              { id: strikerId,    label: "Striker",     player: battingPlayers.find(p => p.user_id === strikerId) },
              { id: nonStrikerId, label: "Non-Striker", player: battingPlayers.find(p => p.user_id === nonStrikerId) },
            ].filter(o => o.id && o.player).map(option => (
              <button key={option.id} onClick={() => handleRunOutVictimSelect(option.id!)}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-white/[0.08] bg-[#111] hover:border-red-500/40 hover:bg-red-500/5 text-left transition-all group">
                <Avatar name={option.player!.username} />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{option.player!.username}{option.player!.is_captain ? " ©" : ""}</p>
                  <p className="text-white/30 text-xs">{option.label}</p>
                </div>
                <span className="text-red-400/50 group-hover:text-red-400 text-xs font-bold transition-colors">OUT →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showMatchEnd && (freshMatchData || match)) {
    return (
      <MatchEndModal
        matchId={matchId!}
        innings={freshMatchData?.innings ?? innings}
        match={freshMatchData?.match ?? match}
        allPlayers={allPlayers}
        onClose={() => { setShowMatchEnd(false); navigate(`/matches/${matchId}`, { replace: true }); }}
        onDone={() => { setShowMatchEnd(false); navigate(`/matches/${matchId}`, { replace: true }); }}
      />
    );
  }

  if (match.status !== "live") return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-white/30 text-lg font-medium">Match is not live</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-green-400 text-sm">
        <ArrowLeft size={16} /> Back
      </button>
    </div>
  );

  if (!currentInnings) return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-white/30 text-lg font-medium">No active innings</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-green-400 text-sm">
        <ArrowLeft size={16} /> Back
      </button>
    </div>
  );

  const Navbar = () => (
    <div className="fixed top-0 left-0 right-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
      <button onClick={() => navigate(`/matches/${matchId}`, { replace: true })}
        className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
        <ArrowLeft size={16} /> Match Detail
      </button>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Live</span>
      </div>
    </div>
  );

  const tossDecidedBatting = match.first_batting_team_id;
  const autoFilledName = tossDecidedBatting === match.team1_id ? match.team1_name : match.team2_name;

  if (phase === "setup") return (
    <>
      <Navbar />
      <div className="pt-14 bg-[#111] min-h-screen">
        <SetupScreen
          innings={currentInnings}
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          is1v1={is1v1}
          autoFilledBattingTeamName={tossDecidedBatting ? autoFilledName : undefined}
          onStart={handleSetupDone}
        />
      </div>
    </>
  );

  if (phase === "over-end") return (
    <>
      <Navbar />
      <div className="pt-14 bg-[#111] min-h-screen">
        <OverEndScreen
          completedOver={overNumber}
          overRuns={currentOverBalls.reduce((s: number, b: any) => s + b.runs_scored + b.extra_runs, 0)}
          overBalls={currentOverBalls}
          bowlingPlayers={bowlingPlayers}
          lastBowlerId={bowlerId}
          onNext={handleOverEnd}
        />
      </div>
    </>
  );

  if (phase === "new-batsman") {
    // All players who can't bat: dismissed + retired + current non-striker
    const usedIds = [
      ...dismissedIds,
      ...retiredIds,
      nonStrikerId,
    ].filter(Boolean);

    const available = battingPlayers.filter((p) => !usedIds.includes(p.user_id));
    const isAllOut  = available.length === 0;

    return (
      <>
        <Navbar />
        <div className="pt-14 bg-[#111] min-h-screen">
          <NewBatsmanScreen
            outName={battingPlayers.find((p) => p.user_id === outBatsmanId)?.username ?? "Batsman"}
            reason={newBatsmanReason}
            battingPlayers={battingPlayers}
            usedIds={usedIds}
            isAllOut={isAllOut}
            onSelect={handleNewBatsman}
            onAllOut={handleAllOut}
          />
        </div>
      </>
    );
  }

  const strikerPlayer    = battingPlayers.find((p) => p.user_id === strikerId);
  const nonStrikerPlayer = battingPlayers.find((p) => p.user_id === nonStrikerId);
  const bowlerPlayer     = bowlingPlayers.find((p) => p.user_id === bowlerId);
  const canSave          = pendingRuns !== null;

  return (
    <div className="min-h-screen bg-[#111]">
      <Navbar />
      <div className="pt-14 px-4 pb-10">
        <div className="max-w-lg mx-auto pt-4 space-y-3">

          {/* ── Score Card ── */}
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/35 text-xs font-medium">
                  {currentInnings.batting_team_name}
                  <span className="text-white/15 mx-1.5">vs</span>
                  {currentInnings.bowling_team_name}
                </p>
                <p className="text-white/20 text-[10px]">
                  Innings {currentInnings.innings_no} · {match.overs} overs
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/25 text-[10px]">Over</p>
                <p className="text-white font-bold text-sm">{overNumber}.{ballInOver}</p>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-2">
              <span className="text-white text-5xl font-bold leading-none tracking-tight">
                {currentInnings.runs}/{currentInnings.wickets}
              </span>
              <span className="text-white/30 text-base mb-1">
                ({oversStr(legalBalls)} ov)
              </span>
            </div>

            {currentInnings.target_runs && (
              <div className="mt-2 mb-3 px-3 py-2 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
                <p className="text-yellow-400 text-sm">
                  Need <span className="font-bold">
                    {Math.max(0, currentInnings.target_runs - currentInnings.runs)}
                  </span> from <span className="font-bold">
                    {(match.overs * 6) - legalBalls}
                  </span> balls
                  {currentInnings.runs >= currentInnings.target_runs && (
                    <span className="ml-2 text-green-400 font-bold">✓ Target Reached!</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-4 mb-3">
              {[
                { l: "4s",     v: currentInnings.fours },
                { l: "6s",     v: currentInnings.sixes },
                { l: "Extras", v: currentInnings.extras },
              ].map((s) => (
                <span key={s.l} className="text-white/20 text-xs">
                  {s.l}: <span className="text-white/50">{s.v}</span>
                </span>
              ))}
            </div>

            {lastSixBalls.length > 0 && (
              <div className="flex items-center gap-1.5 pt-3 border-t border-white/[0.05]">
                <span className="text-white/20 text-[10px] mr-1 w-10 flex-shrink-0">Last 6</span>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {lastSixBalls.map((b: any) => <BallTag key={b.ball_by_ball_id} ball={b} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── At Crease ── */}
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-green-500/8 border border-green-500/20">
              <div className="flex items-center gap-2.5">
                <Avatar name={strikerPlayer?.username ?? "?"} />
                <div>
                  <p className="text-white text-sm font-medium">
                    {strikerPlayer?.username ?? <span className="text-white/25 italic">Not selected</span>}
                  </p>
                  <p className="text-white/25 text-[10px]">{is1v1 ? "Batsman" : "Striker *"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!is1v1 && nonStrikerId && (
                  <button onClick={async () => {
                    const prev = strikerId;
                    setStrikerId(nonStrikerId);
                    setNonStrikerId(prev);
                    await persistState({ strikerId: nonStrikerId, nonStrikerId: prev });
                  }} className="p-1.5 rounded-lg text-white/25 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                    <ArrowLeftRight size={12} />
                  </button>
                )}
                <button onClick={handleRetiredHurt}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-orange-400 border border-orange-500/25 bg-orange-500/8 hover:bg-orange-500/15 transition-colors">
                  Ret. Hurt
                </button>
              </div>
            </div>

            {!is1v1 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Avatar name={nonStrikerPlayer?.username ?? "?"} />
                <div>
                  <p className="text-white/60 text-sm font-medium">
                    {nonStrikerPlayer?.username ?? <span className="text-white/25 italic">Not selected</span>}
                  </p>
                  <p className="text-white/25 text-[10px]">Non-Striker</p>
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.05] pt-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Avatar name={bowlerPlayer?.username ?? "?"} />
                  <div>
                    <p className="text-white/60 text-sm font-medium">
                      {bowlerPlayer?.username ?? <span className="text-white/25 italic">Not selected</span>}
                    </p>
                    <p className="text-white/25 text-[10px]">Bowler</p>
                  </div>
                </div>
                <div className="relative">
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                  <select value={bowlerId} onChange={async (e) => {
                    setBowlerId(e.target.value);
                    await persistState({ bowlerId: e.target.value });
                  }}
                    className="appearance-none bg-[#111] pr-6 pl-2 py-1 text-white/30 text-xs focus:outline-none cursor-pointer rounded-lg border border-white/[0.07]">
                    <option value="">Change...</option>
                    {bowlingPlayers.map((p) => (
                      <option key={p.user_id} value={p.user_id}>{p.username}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ball Builder ── */}
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Build Ball</p>
              <div className="flex items-center gap-2">
                {canSave && (
                  <button onClick={() => { setPendingRuns(null); setSelectedExtra(null); setIsWicket(false); setWicketType("bowled"); }}
                    className="flex items-center gap-1 text-white/25 hover:text-white/50 text-xs transition-colors">
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
                <BallPreview runs={pendingRuns} extra={selectedExtra} isWicket={isWicket} />
              </div>
            </div>

            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Extra</p>
              <div className="grid grid-cols-4 gap-2">
                {EXTRA_TYPES.map((e) => (
                  <button key={e.v} type="button"
                    onClick={() => setSelectedExtra(selectedExtra === e.v ? null : e.v)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-xs font-medium transition-all
                      ${selectedExtra === e.v ? e.color : "bg-[#111] text-white/30 border-white/[0.07] hover:border-white/15"}`}>
                    <span className="font-bold text-sm">{e.short}</span>
                    <span className="text-[9px] opacity-60">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Wicket</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsWicket(!isWicket)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0
                    ${isWicket ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-[#111] text-white/30 border-white/[0.07] hover:border-white/15"}`}>
                  {isWicket ? "✓ Wicket" : "Wicket"}
                </button>
                {isWicket && (
                  <div className="relative flex-1">
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    <select value={wicketType} onChange={(e) => setWicketType(e.target.value as WicketType)}
                      className="w-full appearance-none bg-[#111] border border-red-500/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                      {WICKET_TYPES.map((w) => (
                        <option key={w} value={w}>
                          {w.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Runs Scored</p>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[0, 1, 2, 3].map((r) => (
                  <button key={r} onClick={() => setPendingRuns(pendingRuns === r ? null : r)}
                    className={`py-4 rounded-xl border text-xl font-bold transition-all active:scale-95
                      ${pendingRuns === r
                        ? "bg-white/15 border-white/30 text-white"
                        : "bg-[#111] border-white/[0.07] text-white/50 hover:border-white/20"}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map((r) => (
                  <button key={r} onClick={() => setPendingRuns(pendingRuns === r ? null : r)}
                    className={`py-4 rounded-xl border text-xl font-bold transition-all active:scale-95
                      ${pendingRuns === r
                        ? r === 4 ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                          : r === 6 ? "bg-green-500/30 border-green-500/50 text-green-300"
                          : "bg-white/15 border-white/30 text-white"
                        : r === 4 ? "bg-blue-500/8 border-blue-500/15 text-blue-400/60 hover:bg-blue-500/15"
                        : r === 6 ? "bg-green-500/8 border-green-500/15 text-green-400/60 hover:bg-green-500/15"
                        : "bg-[#111] border-white/[0.07] text-white/50 hover:border-white/20"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Save Ball ── */}
          <button
            onClick={() => addBallMutation.mutate()}
            disabled={!canSave || addBallMutation.isPending}
            className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2
              ${canSave && !addBallMutation.isPending
                ? "bg-green-500 hover:bg-green-600 text-white active:scale-[0.99]"
                : "bg-white/[0.05] text-white/20 border border-white/[0.07] cursor-not-allowed"}`}>
            {addBallMutation.isPending ? (
              <span className="animate-pulse">Saving...</span>
            ) : canSave ? (
              <>
                <Save size={16} />
                Save Ball — {pendingRuns} run{pendingRuns !== 1 ? "s" : ""}
                {selectedExtra ? ` + ${selectedExtra.replace(/_/g, " ")}` : ""}
                {isWicket ? " + Wicket" : ""}
              </>
            ) : (
              "← Select runs to save ball"
            )}
          </button>

          {/* ── Manual End Innings ── */}
          <button
            onClick={async () => {
              if (!confirm("End this innings manually?")) return;
              try {
                await matchService.endInnings(matchId!, currentInnings.innings_id);
                await clearState();
                queryClient.invalidateQueries({ queryKey: ["match", matchId] });

                const freshData = await queryClient.fetchQuery({
                  queryKey: ["match", matchId],
                  queryFn: () => matchService.getById(matchId!),
                });
                const allInnings      = (freshData?.innings ?? []) as any[];
                const completedCount  = allInnings.filter((i: any) => i.is_completed).length;
                if (completedCount >= 2 || allInnings.length >= 2) {
                  setShowMatchEnd(true);
                } else {
                  toast.success("Innings ended");
                  navigate(`/matches/${matchId}`, { replace: true });
                }
              } catch (e: any) {
                toast.error(e?.response?.data?.message || "Failed");
              }
            }}
            className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-white/40 text-sm transition-colors">
            End Innings Manually
          </button>

        </div>
      </div>
    </div>
  );
};

export default LiveScoringPage;