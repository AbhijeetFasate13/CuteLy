import { PrismaClient } from "@prisma/client";
import logger from "./logger";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug("Database query", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log database errors
prisma.$on("error", (e) => {
  logger.error("Database error", {
    error: e.message,
    target: e.target,
  });
});

// Log database info
prisma.$on("info", (e) => {
  logger.info("Database info", { message: e.message });
});

// Log database warnings
prisma.$on("warn", (e) => {
  logger.warn("Database warning", { message: e.message });
});

// Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error("Database health check failed", { error });
    return false;
  }
};

export default prisma;
