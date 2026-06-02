import { createClient } from "redis";
import { logger } from "../utils/logger";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  logger.error({ message: "Redis error", error: err });
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("Redis connected");
  }
};