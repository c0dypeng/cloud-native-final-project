import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";

const IS_TEST = process.env.NODE_ENV === "test";
// Set during k6 load tests so 1k VUs from 127.0.0.1 don't all share the
// 5/min IP-keyed login bucket. Off in production by default.
const LOAD_TEST = process.env.LOAD_TEST === "1";
const BYPASS = IS_TEST || LOAD_TEST;

/** No-op middleware used in NODE_ENV=test / LOAD_TEST=1 so suites don't trip the limiter. */
const passthrough: RequestHandler = (_req, _res, next) => next();

export const loginLimiter: RequestHandler = BYPASS
  ? passthrough
  : rateLimit({
      windowMs: 60 * 1000,
      limit: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many login attempts — please try again later" },
    });

export const adminLoginLimiter: RequestHandler = BYPASS
  ? passthrough
  : rateLimit({
      windowMs: 60 * 1000,
      limit: 3,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error: "Too many admin login attempts — please try again later",
      },
    });

/**
 * Rate-limits report submissions per authenticated user. Falls back to
 * IPv4/IPv6-safe IP key (express-rate-limit's `ipKeyGenerator`) for
 * unauthenticated requests.
 */
export const reportLimiter: RequestHandler = BYPASS
  ? passthrough
  : rateLimit({
      windowMs: 60 * 1000,
      limit: 30,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      keyGenerator: (req, res) => {
        const userReq = req as typeof req & { user?: { id?: string } };
        if (userReq.user?.id) return userReq.user.id;
        return ipKeyGenerator(
          req.ip ?? "",
          res.app?.get("trust proxy") ?? false,
        );
      },
      message: { error: "Too many report submissions — please slow down" },
    });
