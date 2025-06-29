import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, secret) as {
      userId: number;
      email: string;
    };

    // Verify user still exists and is active
    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(token, secret) as {
      userId: number;
      email: string;
    };

    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      };
    }

    next();
  } catch {
    next(); // Continue without authentication
  }
};
