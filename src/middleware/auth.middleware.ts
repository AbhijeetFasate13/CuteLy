/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import logger from "../config/logger";
import { AuthenticationError } from "../utils/errors";
import config from "../config/app.config";
import container from "../config/container";

// Extend Express Request to include user information
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

@injectable()
export class AuthMiddleware {
  constructor(
    @inject("UserRepository") private userRepository: UserRepository,
  ) {}

  /**
   * Middleware to authenticate JWT tokens
   */
  async authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

      if (!token) {
        throw new AuthenticationError("Access token required");
      }

      const decoded = jwt.verify(token, config.get("jwt.secret")) as {
        userId: number;
      };
      const user = await this.userRepository.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new AuthenticationError("Invalid or expired token");
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid JWT token", { error: error.message });
        (res as any).status(401).json({ error: "Invalid token" });
        return;
      }

      logger.error("Authentication failed", {
        error: (error as Error).message,
      });
      (res as any).status(401).json({ error: "Authentication failed" });
    }
  }

  /**
   * Middleware to verify JWT tokens without requiring authentication
   */
  async verifyToken(
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        const decoded = jwt.verify(token, config.get("jwt.secret")) as {
          userId: number;
        };
        const user = await this.userRepository.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
          };
        }
      }

      next();
    } catch {
      // Don't fail the request, just continue without user info
      next();
    }
  }
}

// Factory function to create middleware instance
export function createAuthMiddleware(): AuthMiddleware {
  return new AuthMiddleware(container.resolve("UserRepository"));
}

// Export middleware functions for routes
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const middleware = createAuthMiddleware();
  await middleware.authenticateToken(req as AuthRequest, res, next);
};

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const middleware = createAuthMiddleware();
  await middleware.verifyToken(req as AuthRequest, res, next);
};
