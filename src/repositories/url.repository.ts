import prisma from "../config/prisma";

export class UrlRepository {
  async createUrl(originalUrl: string) {
    return prisma.url.create({
      data: { originalUrl, slug: "" },
    });
  }

  async updateSlug(id: number, slug: string) {
    return prisma.url.update({
      where: { id },
      data: { slug },
    });
  }

  async findById(id: number) {
    return prisma.url.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return prisma.url.findUnique({
      where: { slug },
    });
  }

  async findByOriginalUrl(originalUrl: string) {
    return prisma.url.findFirst({
      where: { originalUrl },
    });
  }

  async incrementHitCount(slug: string) {
    return prisma.url.update({
      where: { slug },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  async updateLastAccessedAt(slug: string) {
    return prisma.url.update({
      where: { slug },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }
}
