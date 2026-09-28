import config from "config";
import { createApp } from "./app";
import { connectDB } from "./config/db";

const port = config.get<number>("server.port");

const start = async () => {
  await connectDB(config.get<string>("db.uri"));

  createApp().listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
