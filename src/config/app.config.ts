import convict from "convict";

/**
 * Application configuration schema and validation
 * Centralizes all environment variables and settings
 */
export const config = convict({
  env: {
    doc: "The application environment",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV",
  },
  port: {
    doc: "The port the server should bind to",
    format: "port",
    default: 3000,
    env: "PORT",
  },
  database: {
    url: {
      doc: "Database connection URL",
      format: String,
      default: "postgresql://localhost:5432/urlshortener",
      env: "DATABASE_URL",
    },
  },
  redis: {
    url: {
      doc: "Redis connection URL",
      format: String,
      default: "redis://localhost:6379",
      env: "REDIS_URL",
    },
    ttl: {
      doc: "Redis cache TTL in seconds",
      format: "nat",
      default: 86400, // 24 hours
      env: "REDIS_TTL",
    },
  },
  jwt: {
    secret: {
      doc: "JWT secret key",
      format: String,
      default: "your-secret-key-change-in-production",
      env: "JWT_SECRET",
      sensitive: true,
    },
    expiresIn: {
      doc: "JWT token expiration time",
      format: String,
      default: "7d",
      env: "JWT_EXPIRES_IN",
    },
  },
  rateLimit: {
    windowMs: {
      doc: "Rate limiting window in milliseconds",
      format: "nat",
      default: 15 * 60 * 1000, // 15 minutes
      env: "RATE_LIMIT_WINDOW_MS",
    },
    max: {
      doc: "Maximum requests per window",
      format: "nat",
      default: 100,
      env: "RATE_LIMIT_MAX",
    },
  },
  security: {
    bcryptRounds: {
      doc: "Number of bcrypt rounds for password hashing",
      format: "nat",
      default: 12,
      env: "BCRYPT_ROUNDS",
    },
  },
  logging: {
    level: {
      doc: "Logging level",
      format: ["error", "warn", "info", "debug"],
      default: "info",
      env: "LOG_LEVEL",
    },
  },
});

// Validate configuration
config.validate({ allowed: "strict" });

export default config;
