import { createClient, RedisClientType } from "redis";
import { logger } from "../shared/utils/logger";

const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const redisEnabled = Boolean(redisUrl);

export const redisClient: RedisClientType | null = redisEnabled
  ? createClient({ url: redisUrl })
  : null;

if (redisClient) {
  redisClient.on("connect", () => {
    logger.info({
      message: "Redis connecting",
      redisUrl,
    });
  });

  redisClient.on("ready", () => {
    logger.info({
      message: "Redis ready",
    });
  });

  redisClient.on("reconnecting", () => {
    logger.warn({
      message: "Redis reconnecting",
    });
  });

  redisClient.on("error", (error) => {
    logger.error({
      message: "Redis error",
      error,
    });
  });
}

export const connectRedis = async () => {
  if (!redisEnabled || !redisClient) {
    logger.info({
      message: "Redis disabled. Skipping connection.",
    });
    return;
  }

  try {
    await redisClient.connect();

    logger.info({
      message: "Redis connected successfully",
    });
  } catch (error) {
    logger.warn({
      message: "Redis unavailable. Continuing without cache.",
      error,
    });
  }
};

export const disconnectRedis = async () => {
  if (!redisEnabled || !redisClient) {
    return;
  }

  try {
    await redisClient.quit();

    logger.info({
      message: "Redis disconnected",
    });
  } catch (error) {
    logger.error({
      message: "Failed to disconnect Redis",
      error,
    });
  }
};