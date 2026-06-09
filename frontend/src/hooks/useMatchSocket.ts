import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketUrl = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;

export const useMatchSocket = (matchId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!matchId) return;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected for match:", matchId);
      socket.emit("join_match", matchId);
    });

    socket.on("score_updated", (data) => {
      console.log("Match score updated:", data);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["balls", matchId] });
      queryClient.invalidateQueries({ queryKey: ["batting", matchId] });
      queryClient.invalidateQueries({ queryKey: ["bowling", matchId] });
    });

    socket.on("scoring_state_updated", (data) => {
      console.log("Scoring state updated:", data);
      queryClient.invalidateQueries({ queryKey: ["scoring-state", matchId] });
    });

    socket.on("scoring_state_cleared", () => {
      console.log("Scoring state cleared");
      queryClient.invalidateQueries({ queryKey: ["scoring-state", matchId] });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected for match:", matchId);
    });

    return () => {
      socket.emit("leave_match", matchId);
      socket.disconnect();
    };
  }, [matchId, queryClient]);
};
