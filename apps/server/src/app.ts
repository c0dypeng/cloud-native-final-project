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

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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

// Prometheus metrics middleware
app.use((req: Request, res: Response, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = (req.route?.path as string | undefined) ?? req.path;
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

// Prometheus metrics endpoint (scraped by Prometheus)
app.get("/metrics", async (_req: Request, res: Response) => {
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
