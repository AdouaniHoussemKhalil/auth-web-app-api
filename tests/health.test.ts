import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app";
import { connectTestDB } from "./helpers/db";

const app = createApp();

beforeAll(connectTestDB);
afterAll(() => mongoose.disconnect());

describe("GET /health", () => {
  it("répond 200 quand la base est connectée, sans authentification", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "up" });
  });

  // Dernier test du fichier : il ferme la connexion.
  it("répond 503 quand la base est indisponible", async () => {
    await mongoose.disconnect();

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "unavailable", database: "down" });
  });
});
