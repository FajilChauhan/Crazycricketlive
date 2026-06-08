// pages/CreateMatchPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { tournamentService } from "../services/tournament.service";
import { matchService } from "../services/match.service";

const schema = z.object({
  team1Id:          z.string().min(1, "Select Team 1"),
  team2Id:          z.string().min(1, "Select Team 2"),
  groundName:       z.string().min(2, "Enter ground name"),
  matchType:        z.string().min(1, "Select match type"),
  overs:            z.coerce.number().min(1, "Min 1 over").max(50, "Max 50 overs"),
  matchNo:          z.coerce.number().min(1, "Min 1"),
  scheduledStartAt: z.string().min(1, "Select match date & time"), 
}).refine((d) => d.team1Id !== d.team2Id, {
  message: "Team 1 and Team 2 must be different",
  path: ["team2Id"],
});

type FormData = z.infer<typeof schema>;

const MATCH_TYPES = ["league", "knockout", "semifinal", "final", "practice", "friendly"];
const OVERS_OPTIONS = [2, 5, 6, 8, 10, 12, 15, 20];

const MATCH_MODES = [
  { v: "team", label: "Team Match",        sub: "Multiple players per side" },
  { v: "1v1",  label: "1v1 — Single Player", sub: "One player each side"   },
];

const CreateMatchPage = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [matchMode, setMatchMode] = useState<"team" | "1v1">("team");

  const { data, isLoading } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn:  () => tournamentService.getById(tournamentId!),
    enabled:  !!tournamentId,
  });

  const teams          = data?.teams ?? [];
  const existingMatches = data?.matches ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      matchNo:          existingMatches.length + 1,
      overs:            10,
      matchType:        "league",
    },
  });

  const team1Id      = watch("team1Id");
  const team2Id      = watch("team2Id");
  const currentOvers = watch("overs");

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      matchService.create({
        tournamentId:     tournamentId!,
        team1Id:          d.team1Id,
        team2Id:          d.team2Id,
        groundName:       d.groundName,
        matchType:        d.matchType,
        overs:            d.overs,
        matchNo:          d.matchNo,
        matchMode:        matchMode,
        scheduledStartAt: d.scheduledStartAt?.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      toast.success("Match created!");
      const matchId = res?.match_id ?? res?.matchId;
      navigate(matchId ? `/matches/${matchId}` : `/tournaments/${tournamentId}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create match");
    },
  });

  if (isLoading) return <PageLoader />;

 return (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] px-3 sm:px-4 md:px-6 py-5 sm:py-8">
    <div className="max-w-xl lg:max-w-2xl mx-auto space-y-5 sm:space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/30 hover:text-white/60 text-xs sm:text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center text-xl sm:text-2xl mx-auto mb-4">
          🏏
        </div>

        <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
          Create Match
        </h1>

        <p className="text-white/35 text-xs sm:text-sm mt-1">
          {data?.tournament?.tournament_name}
        </p>
      </div>

      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-4 sm:p-6 md:p-7 space-y-5">

        {/* Match Mode */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Match Mode
          </label>

          <div className="relative">
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
            />

            <select
              value={matchMode}
              onChange={(e) => {
                setMatchMode(e.target.value as "team" | "1v1");
                setValue("team1Id", "");
                setValue("team2Id", "");
              }}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
            >
              {MATCH_MODES.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label} — {m.sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {matchMode === "1v1" ? "Player 1 Team" : "Team 1"}
            </label>

            <div className="relative">
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              />

              <select
                {...register("team1Id")}
                className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-3 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
              >
                <option value="">Select...</option>

                {teams
                  .filter((t: any) => t.team_id !== team2Id)
                  .map((t: any) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
              </select>
            </div>

            {errors.team1Id && (
              <p className="text-red-400 text-xs mt-1">
                {errors.team1Id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              {matchMode === "1v1" ? "Player 2 Team" : "Team 2"}
            </label>

            <div className="relative">
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              />

              <select
                {...register("team2Id")}
                className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-3 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
              >
                <option value="">Select...</option>

                {teams
                  .filter((t: any) => t.team_id !== team1Id)
                  .map((t: any) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
              </select>
            </div>

            {errors.team2Id && (
              <p className="text-red-400 text-xs mt-1">
                {errors.team2Id.message}
              </p>
            )}
          </div>

        </div>

        {/* Ground Name */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Ground Name
          </label>

          <div className="relative">
            <MapPin
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25"
            />

            <input
              {...register("groundName")}
              placeholder="e.g. Sector 12 Ground"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
            />
          </div>

          {errors.groundName && (
            <p className="text-red-400 text-xs mt-1.5">
              {errors.groundName.message}
            </p>
          )}
        </div>

        {/* Match Type */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Match Type
          </label>

          <div className="relative">
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
            />

            <select
              {...register("matchType")}
              className="w-full appearance-none bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
            >
              {MATCH_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Time */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Match Date & Time
            <span className="text-red-400">*</span>
          </label>

          <input
            {...register("scheduledStartAt")}
            type="datetime-local"
            className={`w-full bg-[#111] border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all [color-scheme:dark]
            ${
              errors.scheduledStartAt
                ? "border-red-500/50"
                : "border-white/[0.08]"
            }`}
          />

          {errors.scheduledStartAt && (
            <p className="text-red-400 text-xs mt-1.5">
              {errors.scheduledStartAt.message}
            </p>
          )}
        </div>

        {/* Overs */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-3">
            Overs
          </label>

          <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
            {OVERS_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setValue("overs", o)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                ${
                  Number(currentOvers) === o
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-[#111] text-white/40 border-white/[0.08] hover:border-white/20"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          <input
            {...register("overs", { valueAsNumber: true })}
            type="number"
            min="1"
            max="50"
            placeholder="Custom overs..."
            className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-all"
          />
        </div>

        {/* Match Number */}
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">
            Match Number
          </label>

          <input
            {...register("matchNo", { valueAsNumber: true })}
            type="number"
            min="1"
            className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit(
            (d) => mutation.mutate(d),
            (errs) => {
              const firstError = Object.values(errs)[0];
              if (firstError?.message)
                toast.error(firstError.message as string);
            }
          )}
          disabled={mutation.isPending || teams.length < 2}
          className="w-full min-h-[48px] bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm sm:text-base transition-colors"
        >
          {mutation.isPending
            ? "Creating..."
            : teams.length < 2
            ? "Need at least 2 teams"
            : "Create Match"}
        </button>

        {teams.length < 2 && (
          <p className="text-center text-yellow-400/70 text-xs">
            Create at least 2 teams in this tournament first
          </p>
        )}

      </div>
    </div>
  </div>
);
};

const PageLoader = () => (
  <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center">
    <div className="text-white/20 text-sm animate-pulse">Loading...</div>
  </div>
);

export default CreateMatchPage;