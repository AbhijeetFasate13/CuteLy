import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import logger from "../config/logger";
import { AuthenticationError, ConflictError } from "../utils/errors";
import config from "../config/app.config";

@injectable()
export class AuthService {
  constructor(
    @inject("UserRepository") private userRepository: UserRepository,
  ) {}

  /**
   * Register a new user
   */
  async registerUser(email: string, password: string, name?: string) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        password,
        config.get("security.bcryptRounds"),
      );

      // Create user
      const user = await this.userRepository.createUser(
        email,
        hashedPassword,
        name,
      );

      // Generate JWT token
      const token = this.generateToken(user.id);

      logger.info("User registered successfully", { email, userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      logger.error("User registration failed", {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async loginUser(email: string, password: string) {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError("Account is deactivated");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Generate JWT token
      const token = this.generateToken(user.id);

      logger.info("User logged in successfully", { email, userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      logger.error("User login failed", {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isValidPassword) {
        throw new AuthenticationError("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(
        newPassword,
        config.get("security.bcryptRounds"),
      );

      // Update password
      await this.userRepository.updateUser(userId, {
        password: hashedNewPassword,
      });

      logger.info("Password changed successfully", { userId });

      return { message: "Password updated successfully" };
    } catch (error) {
      logger.error("Password change failed", {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, name: string) {
    try {
      const user = await this.userRepository.updateUser(userId, { name });

      logger.info("Profile updated successfully", { userId });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      logger.error("Profile update failed", {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user profile without sensitive data
   */
  async getUserProfile(userId: number) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Get user profile failed", {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(userId: number): string {
    const secret = config.get("jwt.secret") as Secret;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { expiresIn: config.get("jwt.expiresIn") } as any;
    return jwt.sign({ userId }, secret, options);
  }
}
