import { Server } from "socket.io";
import { logger } from "../utils/logger";

export const setupSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("join_match", (matchId: string) => {
      socket.join(`match_${matchId}`);
    });

    socket.on("leave_match", (matchId: string) => {
      socket.leave(`match_${matchId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};