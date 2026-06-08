import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../../services/dashboard.service";

export const useLiveMatches = () => {
  return useQuery({
    queryKey: ["live-matches"],

    queryFn:
      dashboardService.getLiveMatches,

    refetchInterval: 10000,
  });
};