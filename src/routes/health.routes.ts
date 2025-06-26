import { Router } from "express";
import { checkDatabaseHealth } from "../config/prisma";
import redis from "../config/redis";
import logger from "../config/logger";

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Comprehensive health check for the API, database, and Redis
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All systems healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "healthy"
 *                     redis:
 *                       type: string
 *                       example: "healthy"
 *       503:
 *         description: One or more services unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "unhealthy"
 *                     redis:
 *                       type: string
 *                       example: "healthy"
 */
router.get("/health", async (_req, res) => {
  const startTime = Date.now();

  try {
    // Check database health
    const dbHealthy = await checkDatabaseHealth();

    // Check Redis health
    let redisHealthy = false;
    try {
      await redis.ping();
      redisHealthy = true;
    } catch (error) {
      logger.error("Redis health check failed", { error });
    }

    const duration = Date.now() - startTime;
    const uptime = process.uptime();

    const healthStatus = {
      status: dbHealthy && redisHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      responseTime: `${duration}ms`,
      services: {
        database: dbHealthy ? "healthy" : "unhealthy",
        redis: redisHealthy ? "healthy" : "unhealthy",
      },
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;

    logger.info("Health check completed", {
      status: healthStatus.status,
      duration,
      services: healthStatus.services,
    });

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error("Health check failed", { error });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

export default router;
