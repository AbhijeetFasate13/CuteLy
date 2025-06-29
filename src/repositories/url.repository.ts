import prisma from "../config/prisma";

export class UrlRepository {
  /**
   * Create a new URL record in the database
   * @param originalUrl - The long URL to be shortened
   * @param userId - Optional user ID for ownership
   * @param title - Optional title for the URL
   * @param description - Optional description for the URL
   * @returns Promise with the created URL record
   */
  async createUrl(
    originalUrl: string,
    userId?: number,
    title?: string,
    description?: string,
  ) {
    return prisma.url.create({
      data: {
        originalUrl,
        slug: "", // Will be updated after creation
        userId,
        title,
        description,
      },
    });
  }

  /**
   * Update the slug for an existing URL record
   * @param id - The URL record ID
   * @param slug - The new slug to assign
   * @returns Promise with the updated URL record
   */
  async updateSlug(id: number, slug: string) {
    return prisma.url.update({
      where: { id },
      data: { slug },
    });
  }

  /**
   * Find a URL record by its database ID
   * @param id - The URL record ID
   * @returns Promise with the URL record or null
   */
  async findById(id: number) {
    return prisma.url.findUnique({
      where: { id },
    });
  }

  /**
   * Find a URL record by its slug
   * @param slug - The short URL slug
   * @returns Promise with the URL record or null
   */
  async findBySlug(slug: string) {
    return prisma.url.findUnique({
      where: { slug },
    });
  }

  /**
   * Find a URL record by its original URL
   * @param originalUrl - The original long URL
   * @returns Promise with the URL record or null
   */
  async findByOriginalUrl(originalUrl: string) {
    return prisma.url.findFirst({
      where: { originalUrl },
    });
  }

  /**
   * Increment the hit count and update last accessed time for a URL
   * @param slug - The short URL slug
   * @returns Promise with the updated URL record
   */
  async incrementHitCount(slug: string) {
    return prisma.url.update({
      where: { slug },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Update the last accessed time for a URL (legacy method)
   * @param slug - The short URL slug
   * @returns Promise with the updated URL record
   */
  async updateLastAccessedAt(slug: string) {
    return prisma.url.update({
      where: { slug },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Get all URLs owned by a specific user
   * @param userId - The user's ID
   * @returns Promise with array of user's URLs
   */
  async getUserUrls(userId: number) {
    return prisma.url.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Delete a URL record from the database
   * @param id - The URL record ID to delete
   * @returns Promise with the deleted URL record
   */
  async deleteUrl(id: number) {
    return prisma.url.delete({
      where: { id },
    });
  }
}
