import { Server } from "socket.io";
import { logger } from "../shared/utils/logger";

let ioInstance: Server | null = null;

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
      logger.info(`Socket ${socket.id} joined room match_${matchId}`);
    });

    socket.on("leave_match", (matchId: string) => {
      socket.leave(`match_${matchId}`);
      logger.info(`Socket ${socket.id} left room match_${matchId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIo = () => ioInstance;

export const emitToMatch = (matchId: string, event: string, data: any) => {
  if (ioInstance) {
    ioInstance.to(`match_${matchId}`).emit(event, data);
    logger.info(`Socket emit to match_${matchId}: ${event}`);
  } else {
    logger.warn(`Cannot emit socket event ${event} to match_${matchId}: socket server not initialized`);
  }
};