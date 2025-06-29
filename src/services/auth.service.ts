import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import logger from "../config/logger";

export class AuthService {
  private userRepository: UserRepository;
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
  private readonly JWT_EXPIRES_IN = "7d"; // 7 days

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new user account
   * @param email - User's email address
   * @param password - User's password (will be hashed)
   * @param name - User's display name
   * @returns Promise with user data and authentication token
   */
  async registerUser(email: string, password: string, name?: string) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash the password securely
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create the new user
      const newUser = await this.userRepository.createUser({
        email,
        password: hashedPassword,
        name,
      });

      // Generate authentication token
      const token = this.generateToken(newUser.id);

      logger.info("User registered successfully", {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
      });

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: newUser.createdAt,
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
   * Authenticate a user and generate login token
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with user data and authentication token
   */
  async loginUser(email: string, password: string) {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Generate authentication token
      const token = this.generateToken(user.id);

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
      });

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
   * Change user's password
   * @param userId - User's ID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Promise with success message
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      // Get user's current data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(
        newPassword,
        this.SALT_ROUNDS,
      );

      // Update user's password
      await this.userRepository.updateUser(userId, {
        password: hashedNewPassword,
      });

      logger.info("Password changed successfully", {
        userId,
        email: user.email,
      });

      return {
        message: "Password updated successfully",
      };
    } catch (error) {
      logger.error("Password change failed", {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update user's profile information
   * @param userId - User's ID
   * @param name - New display name
   * @returns Promise with updated user data
   */
  async updateProfile(userId: number, name: string) {
    try {
      // Get current user data
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        throw new Error("User not found");
      }

      // Update user's name
      const updatedUser = await this.userRepository.updateUser(userId, {
        name,
      });

      logger.info("Profile updated successfully", {
        userId,
        email: currentUser.email,
        newName: name,
      });

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          createdAt: updatedUser.createdAt,
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
   * Get user's profile information (without sensitive data)
   * @param userId - User's ID
   * @returns Promise with user profile data
   */
  async getUserProfile(userId: number) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Return user data without password
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to get user profile", {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns Promise with decoded token payload
   */
  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: number };
      return decoded;
    } catch (error) {
      logger.warn("Token verification failed", {
        error: (error as Error).message,
      });
      throw new Error("Invalid or expired token");
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate a JWT token for user authentication
   * @param userId - User's ID to include in token
   * @returns JWT token string
   */
  private generateToken(userId: number): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }
}
