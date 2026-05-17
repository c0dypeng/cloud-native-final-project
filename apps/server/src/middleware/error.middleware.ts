import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Express 4 requires the 4-arity signature to be recognized as an error
// handler. We type it via ErrorRequestHandler so the unused params type-check.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const e = err as AppError;
  const statusCode = e.statusCode ?? 500;
  const message = e.message || "Internal Server Error";
  logger.error({ err, statusCode }, "request errored");
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: e.stack } : {}),
  });
};
