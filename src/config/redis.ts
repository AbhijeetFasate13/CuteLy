import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

export default redis;
