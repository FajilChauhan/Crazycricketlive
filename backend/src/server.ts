import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { testDbConnection } from "./config/dbconfig";
import { setupSocket } from "./socket";
import { connectRedis } from "./config/redis";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await testDbConnection();
    await connectRedis();

    const httpServer = http.createServer(app);
    const io = setupSocket(httpServer);

    app.set("io", io);

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ message: "Failed to start server", error });
    process.exit(1);
  }
};

startServer();