/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import urlRoutes from "./routes/url.routes";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import analyticsRoutes from "./routes/analytics.routes";
import { specs } from "./config/swagger";
import logger from "./config/logger";

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`,
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    );
  });
  next();
});

// Basic health check endpoint (redirects to comprehensive health check)
app.get("/", (_req: any, res: any) => {
  res.json({
    status: "OK",
    message: "CuteLy URL Shortener API is running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    healthCheck: "/health",
    documentation: "/api-docs",
    features: [
      "URL shortening with custom slugs",
      "User authentication and management",
      "Comprehensive analytics and tracking",
      "Redis caching for performance",
      "Rate limiting and security",
    ],
  });
});

// API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "CuteLy API Documentation",
  }),
);

// Health check routes
app.use(healthRoutes);

// Authentication routes
app.use(authRoutes);

// Analytics routes
app.use(analyticsRoutes);

// API routes
app.use(urlRoutes);

// 404 handler - must be last
app.use((req: any, res: any) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, req: any, res: any) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: (req as any).method,
    path: (req as any).path,
    ip: (req as any).ip,
    userAgent: (req as any).get("User-Agent"),
  });
  (res as any).status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(
    `📚 API Documentation available at http://localhost:${PORT}/api-docs`,
  );
  logger.info(
    `🔐 Authentication endpoints available at http://localhost:${PORT}/api/auth`,
  );
  logger.info(
    `📈 Analytics endpoints available at http://localhost:${PORT}/api/analytics`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});
