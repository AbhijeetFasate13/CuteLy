import Redis from "ioredis";
import "dotenv/config";

// Create a mock Redis for test environments or when Redis is not available
const createMockRedis = () => {
  const mockRedis = {
    get: async () => null,
    set: async () => "OK" as const,
    setex: async () => "OK" as const,
    del: async () => 1,
    incr: async () => 1,
    expire: async () => 1,
    ping: async () => "PONG",
    disconnect: () => {},
    on: () => {},
    off: () => {},
    quit: async () => "OK",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mockRedis as any;
};

// Determine if we should use mock Redis
const shouldUseMockRedis = () => {
  // Always use mock in test environment
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  // Use mock if no Redis URL is provided
  if (!process.env.REDIS_URL) {
    return true;
  }

  // Use mock if Redis URL is localhost (likely not available in CI)
  if (
    process.env.REDIS_URL === "redis://localhost:6379/0" ||
    process.env.REDIS_URL === "redis://localhost:6379"
  ) {
    return true;
  }

  return false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any;

if (shouldUseMockRedis()) {
  console.log("Using mock Redis for environment:", process.env.NODE_ENV);
  redis = createMockRedis();
} else {
  try {
    console.log("Connecting to Redis:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

    // Handle Redis connection errors gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis.on("error", (error: any) => {
      console.warn("Redis connection error:", error.message);
      // Don't crash the app if Redis is unavailable
    });

    redis.on("connect", () => {
      console.log("Redis connected successfully");
    });
  } catch (error) {
    console.warn("Failed to connect to Redis, using mock:", error);
    redis = createMockRedis();
  }
}

export default redis;
