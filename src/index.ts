import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import urlRoutes from "./routes/url.routes";
import healthRoutes from "./routes/health.routes";
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
app.use((req, res, next) => {
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
app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    message: "CuteLy URL Shortener API is running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    healthCheck: "/health",
    documentation: "/api-docs",
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

// API routes
app.use(urlRoutes);

// 404 handler
app.use("*", (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(
    `📚 API Documentation available at http://localhost:${PORT}/api-docs`,
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
