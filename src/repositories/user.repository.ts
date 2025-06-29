import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { PrismaClient } from "@prisma/client";

@injectable()
export class UserRepository {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

  /**
   * Create a new user
   * @param email - User's email address
   * @param password - Hashed password
   * @param name - User's display name
   * @returns Promise with created user
   */
  async createUser(email: string, password: string, name?: string) {
    return this.prisma.user.create({
      data: {
        email,
        password,
        name,
      },
    });
  }

  /**
   * Find user by email address
   * @param email - User's email address
   * @returns Promise with user or null
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   * @param id - User's ID
   * @returns Promise with user or null
   */
  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update user information
   * @param id - User's ID
   * @param data - Data to update
   * @returns Promise with updated user
   */
  async updateUser(
    id: number,
    data: {
      email?: string;
      password?: string;
      name?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user account
   * @param id - User's ID
   * @returns Promise with deleted user
   */
  async deleteUser(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Deactivate a user account
   * @param id - The user's database ID
   * @returns Promise with the deactivated user record
   */
  async deactivateUser(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate a user account
   * @param id - The user's database ID
   * @returns Promise with the reactivated user record
   */
  async reactivateUser(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async getUserUrls(userId: number) {
    return this.prisma.url.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserAnalytics(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.url.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        clicks: {
          where: {
            clickedAt: {
              gte: startDate,
            },
          },
        },
      },
    });
  }
}
