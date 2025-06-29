/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
} from "../dto/url.dto";
import { ValidationError, AuthenticationError } from "../utils/errors";
import logger from "../config/logger";
import container from "../config/container";

// Extend Express Request to include user information from JWT
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

@injectable()
export class AuthController {
  constructor(@inject("AuthService") private authService: AuthService) {}

  /**
   * Register a new user
   */
  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = RegisterSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { email, password, name } = validationResult.data;

      const result = await this.authService.registerUser(email, password, name);

      logger.info("User registered successfully", { email });
      (res as any).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }

      logger.error("User registration failed", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to register user" });
    }
  }

  /**
   * Login user
   */
  async loginUser(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = LoginSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { email, password } = validationResult.data;

      const result = await this.authService.loginUser(email, password);

      logger.info("User logged in successfully", { email });
      (res as any).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }
      if (error instanceof AuthenticationError) {
        (res as any).status(401).json({ error: error.message });
        return;
      }

      logger.error("User login failed", { error: (error as Error).message });
      (res as any).status(500).json({ error: "Failed to login user" });
    }
  }

  /**
   * Change user password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }

      // Validate request body
      const validationResult = ChangePasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { currentPassword, newPassword } = validationResult.data;

      const result = await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      logger.info("Password changed successfully", { userId });
      (res as any).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }
      if (error instanceof AuthenticationError) {
        (res as any).status(401).json({ error: error.message });
        return;
      }

      logger.error("Password change failed", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to change password" });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }

      // Validate request body
      const validationResult = UpdateProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { name } = validationResult.data;

      const result = await this.authService.updateProfile(userId, name);

      logger.info("Profile updated successfully", { userId });
      (res as any).json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }

      logger.error("Profile update failed", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to update profile" });
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }

      const profile = await this.authService.getUserProfile(userId);

      logger.info("User profile retrieved", { userId });
      (res as any).json(profile);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        (res as any).status(401).json({ error: error.message });
        return;
      }

      logger.error("Get user profile failed", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to get user profile" });
    }
  }
}

// Factory function to create controller instance
export function createAuthController(): AuthController {
  return new AuthController(container.resolve("AuthService"));
}

// Export controller functions for routes
export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAuthController();
  await controller.registerUser(req, res);
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const controller = createAuthController();
  await controller.loginUser(req, res);
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAuthController();
  await controller.changePassword(req, res);
};

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAuthController();
  await controller.updateProfile(req, res);
};

export const getUserProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAuthController();
  await controller.getUserProfile(req, res);
};
