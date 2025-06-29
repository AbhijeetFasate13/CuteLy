import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import logger from "../config/logger";

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters long",
        });
      }

      const result = await this.authService.registerUser(email, password, name);

      logger.info("User registered successfully", {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(201).json({
        message: "User registered successfully",
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      logger.error("Registration failed", { error: (error as Error).message });
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      const result = await this.authService.loginUser(email, password);

      logger.info("User logged in successfully", {
        userId: result.user.id,
        email: result.user.email,
      });

      res.json({
        message: "Login successful",
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      logger.error("Login failed", { error: (error as Error).message });
      res.status(401).json({
        error: (error as Error).message,
      });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "New password must be at least 6 characters long",
        });
      }

      await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      logger.info("Password changed successfully", { userId });

      res.json({
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Password change failed", {
        error: (error as Error).message,
      });
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const result = await this.authService.updateProfile(userId, name);

      logger.info("Profile updated successfully", { userId });

      res.json({
        message: "Profile updated successfully",
        user: result.user,
      });
    } catch (error) {
      logger.error("Profile update failed", {
        error: (error as Error).message,
      });
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      // Get user profile without password
      const user = await this.authService.getUserProfile(userId);

      res.json({
        user,
      });
    } catch (error) {
      logger.error("Get profile failed", { error: (error as Error).message });
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }
}
