import prisma from "config/prisma";

export class UserRepository {
  async createUser(email: string, password: string, name?: string) {
    return prisma.user.create({
      data: {
        email,
        password,
        name,
      },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: number, data: { name?: string; isActive?: boolean }) {
    return prisma.user.update({
      where: { id },
      data,
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
