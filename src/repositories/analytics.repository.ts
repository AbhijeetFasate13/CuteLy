import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { PrismaClient } from "@prisma/client";

export interface ClickData {
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  language?: string;
}

@injectable()
export class AnalyticsRepository {
  constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

  /**
   * Track a click with analytics data
   * @param urlId - The URL ID that was clicked
   * @param userId - Optional user ID who clicked
   * @param clickData - Analytics data about the click
   * @returns Promise with created click record
   */
  async trackClick(urlId: number, userId: number | null, clickData: ClickData) {
    return this.prisma.click.create({
      data: {
        urlId,
        userId,
        ...clickData,
      },
    });
  }

  /**
   * Get analytics for a specific URL
   * @param urlId - The URL ID to get analytics for
   * @param days - Number of days to look back
   * @returns Promise with analytics data
   */
  async getUrlAnalytics(urlId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const clicks = await this.prisma.click.findMany({
      where: {
        urlId,
        clickedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        clickedAt: "desc",
      },
    });

    // Process analytics data
    const analytics = {
      totalClicks: clicks.length,
      uniqueClicks: new Set(clicks.map((click) => click.ipAddress)).size,
      countries: this.countOccurrences(
        clicks
          .map((click) => click.country)
          .filter((c): c is string => c !== null),
      ),
      cities: this.countOccurrences(
        clicks
          .map((click) => click.city)
          .filter((c): c is string => c !== null),
      ),
      deviceTypes: this.countOccurrences(
        clicks
          .map((click) => click.deviceType)
          .filter((d): d is string => d !== null),
      ),
      browsers: this.countOccurrences(
        clicks
          .map((click) => click.browser)
          .filter((b): b is string => b !== null),
      ),
      operatingSystems: this.countOccurrences(
        clicks.map((click) => click.os).filter((o): o is string => o !== null),
      ),
      referrers: this.countOccurrences(
        clicks
          .map((click) => click.referrer)
          .filter((r): r is string => r !== null),
      ),
      recentClicks: clicks.slice(0, 10), // Last 10 clicks
    };

    return analytics;
  }

  /**
   * Get analytics for a specific user
   * @param userId - The user ID to get analytics for
   * @param days - Number of days to look back
   * @returns Promise with user analytics data
   */
  async getUserAnalytics(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const urls = await this.prisma.url.findMany({
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

    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks.length, 0);

    return {
      totalUrls,
      totalClicks,
      urls: urls.map((url) => ({
        id: url.id,
        slug: url.slug,
        originalUrl: url.originalUrl,
        hitCount: url.hitCount,
        createdAt: url.createdAt,
        clicks: url.clicks.length,
      })),
    };
  }

  /**
   * Get global analytics across all users
   * @param days - Number of days to look back
   * @returns Promise with global analytics data
   */
  async getGlobalAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalUrls, totalClicks, totalUsers] = await Promise.all([
      this.prisma.url.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      this.prisma.click.count({
        where: {
          clickedAt: {
            gte: startDate,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ]);

    return {
      totalUrls,
      totalClicks,
      totalUsers,
    };
  }

  /**
   * Helper method to count occurrences in an array
   * @param items - Array of items to count
   * @returns Object with item counts
   */
  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
