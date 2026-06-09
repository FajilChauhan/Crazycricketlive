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

export const getCache = async (key: string): Promise<string | null> => {
  if (!redisEnabled || !redisClient || !redisClient.isOpen) {
    return null;
  }
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.warn({
      message: `Failed to get cache key: ${key}`,
      error,
    });
    return null;
  }
};

export const setCache = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  if (!redisEnabled || !redisClient || !redisClient.isOpen) {
    return;
  }
  try {
    if (ttlSeconds) {
      await redisClient.set(key, value, { EX: ttlSeconds });
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    logger.warn({
      message: `Failed to set cache key: ${key}`,
      error,
    });
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!redisEnabled || !redisClient || !redisClient.isOpen) {
    return;
  }
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.warn({
      message: `Failed to delete cache key: ${key}`,
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