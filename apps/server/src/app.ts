import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import {
  register,
  httpRequestsTotal,
  httpRequestDuration,
} from "./lib/metrics.js";

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS — supports comma-separated CORS_ORIGIN list (e.g. web + admin origins).
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / non-browser (no Origin header)
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  }),
);

// Structured JSON logging (replaces morgan)
app.use(
  pinoHttp({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),
);

// Cookie parsing
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics middleware — use the matched route template (e.g.
// "/events/:id") rather than the raw req.path (which contains IDs and would
// explode the metric cardinality).
app.use((req: Request, res: Response, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const matched = req.route?.path as string | undefined;
    // req.baseUrl includes the parent router prefix (e.g. "/api/events")
    const route = matched ? `${req.baseUrl ?? ""}${matched}` : "unmatched";
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

// Prometheus metrics endpoint — gated by METRICS_TOKEN env if set so the
// scrape job in K8s ServiceMonitor / Prometheus can include the token but
// the public internet can't read all our internal counters.
const METRICS_TOKEN = process.env.METRICS_TOKEN;
app.get("/metrics", async (req: Request, res: Response) => {
  if (METRICS_TOKEN) {
    const presented =
      (req.query.token as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (presented !== METRICS_TOKEN) {
      res.status(401).type("text/plain").send("metrics access denied");
      return;
    }
  }
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// API routes
app.use("/api", router);

// Root
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Safety Response API", version: "1.0.0", status: "healthy" });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
