import { logger } from "./utils/logger";
import config from "config";
import { createApp } from "./app";
import { connectDB } from "./config/db";

const port = config.get<number>("server.port");

const start = async () => {
  await connectDB(config.get<string>("db.uri"));

  createApp().listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
