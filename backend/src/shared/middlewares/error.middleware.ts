import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    err instanceof ApiError ? err.message : "Internal Server Error";

  logger.error({
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(statusCode).json({
    success: false,
    message,
  });
};