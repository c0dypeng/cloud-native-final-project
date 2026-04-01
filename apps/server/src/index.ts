import "dotenv/config";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  logger.info({ port: PORT, env: NODE_ENV }, "Server started");
});
