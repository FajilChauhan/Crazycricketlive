// pages/CreateTournamentPage.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Trophy, Building } from "lucide-react";
import toast from "react-hot-toast";
import { tournamentService } from "../services/tournament.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  tournamentName: z.string().min(3, "Minimum 3 characters").max(100),
  organizationName: z.string().min(2, "Minimum 2 characters").max(100),
});

type FormData = z.infer<typeof schema>;

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => tournamentService.create({
      tournamentName: data.tournamentName,
      organizationName: data.organizationName,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament created!");
      navigate(`/tournaments/${data.tournament_id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create tournament");
    },
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] px-4 py-8">
      <div className="max-w-lg mx-auto">

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
            🏆
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            Create Tournament
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Set up your cricket tournament
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-8">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Tournament Name
              </label>
              <div className="relative">
                <Trophy size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  {...register("tournamentName")}
                  placeholder="City Premier League 2025"
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                />
              </div>
              {errors.tournamentName && (
                <p className="text-red-400 text-xs mt-1.5">{errors.tournamentName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Organization Name
              </label>
              <div className="relative">
                <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  {...register("organizationName")}
                  placeholder="Gully Sports Club"
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                />
              </div>
              {errors.organizationName && (
                <p className="text-red-400 text-xs mt-1.5">{errors.organizationName.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2"
            >
              {mutation.isPending ? "Creating..." : "Create Tournament"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentPage;