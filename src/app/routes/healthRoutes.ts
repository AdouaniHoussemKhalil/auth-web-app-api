import { Router } from "express";
import mongoose from "mongoose";

const healthRoutes = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: État du service, pour les health checks (Render, Docker)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service prêt, base de données connectée
 *       503:
 *         description: Base de données indisponible
 */
healthRoutes.get("/", (_req, res) => {
  // readyState 1 = connecté.
  const database = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(database === "up" ? 200 : 503).json({
    status: database === "up" ? "ok" : "unavailable",
    database,
    uptime: Math.round(process.uptime()),
  });
});

export default healthRoutes;
