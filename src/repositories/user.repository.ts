import prisma from "../config/prisma";

export class UserRepository {
  /**
   * Create a new user account
   * @param userData - User registration data
   * @returns Promise with the created user record
   */
  async createUser(userData: {
    email: string;
    password: string;
    name?: string;
  }) {
    return prisma.user.create({
      data: userData,
    });
  }

  /**
   * Find a user by their email address
   * @param email - The user's email address
   * @returns Promise with the user record or null
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by their database ID
   * @param id - The user's database ID
   * @returns Promise with the user record or null
   */
  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update a user's information
   * @param id - The user's database ID
   * @param updateData - The data to update
   * @returns Promise with the updated user record
   */
  async updateUser(
    id: number,
    updateData: {
      email?: string;
      password?: string;
      name?: string;
      isActive?: boolean;
    },
  ) {
    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Deactivate a user account
   * @param id - The user's database ID
   * @returns Promise with the deactivated user record
   */
  async deactivateUser(id: number) {
    return prisma.user.update({
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
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async getUserUrls(userId: number) {
    return prisma.url.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserAnalytics(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.url.findMany({
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
