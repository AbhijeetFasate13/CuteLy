import prismaClient from "config/prisma";

export class AnalyticsRepository {
  private prisma;

  constructor(prisma = prismaClient) {
    this.prisma = prisma;
  }

  /**
   * Track a click on a URL with detailed analytics data
   * @param urlId - The ID of the URL that was clicked
   * @param userId - Optional user ID if the clicker is logged in
   * @param clickData - Detailed information about the click
   * @returns Promise with the created click record
   */
  async trackClick(
    urlId: number,
    userId: number | null,
    clickData: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      country?: string;
      city?: string;
      region?: string;
      timezone?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      language?: string;
    },
  ) {
    return this.prisma.click.create({
      data: {
        urlId,
        userId,
        ...clickData,
      },
    });
  }

  /**
   * Get comprehensive analytics for a specific URL
   * @param urlId - The ID of the URL to analyze
   * @param days - Number of days to look back (default: 30)
   * @returns Promise with detailed analytics data
   */
  async getUrlAnalytics(urlId: number, days: number = 30) {
    // Calculate the date threshold for filtering
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get all clicks for this URL within the time period
    const clicks = await this.prisma.click.findMany({
      where: {
        urlId,
        clickedAt: {
          gte: dateThreshold,
        },
      },
      orderBy: {
        clickedAt: "desc",
      },
    });

    // Calculate analytics from the click data
    const totalClicks = clicks.length;
    const uniqueClicks = new Set(clicks.map((click) => click.ipAddress)).size;

    // Aggregate data by various dimensions
    const countries = this.aggregateByField(clicks, "country");
    const cities = this.aggregateByField(clicks, "city");
    const deviceTypes = this.aggregateByField(clicks, "deviceType");
    const browsers = this.aggregateByField(clicks, "browser");
    const operatingSystems = this.aggregateByField(clicks, "os");
    const referrers = this.aggregateByField(clicks, "referrer");

    return {
      totalClicks,
      uniqueClicks,
      countries,
      cities,
      deviceTypes,
      browsers,
      operatingSystems,
      referrers,
      recentClicks: clicks.slice(0, 10), // Return last 10 clicks
    };
  }

  /**
   * Get analytics for all URLs owned by a specific user
   * @param userId - The user's ID
   * @param days - Number of days to look back (default: 30)
   * @returns Promise with user's URL analytics
   */
  async getUserAnalytics(userId: number, days: number = 30) {
    // Calculate the date threshold for filtering
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get all URLs owned by the user with their click data
    const urls = await this.prisma.url.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateThreshold,
        },
      },
      include: {
        clicks: {
          where: {
            clickedAt: {
              gte: dateThreshold,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks.length, 0);
    const totalUniqueClicks = new Set(
      urls.flatMap((url) => url.clicks.map((click) => click.ipAddress)),
    ).size;

    // Get top performing URLs
    const topUrls = urls
      .map((url) => ({
        slug: url.slug,
        originalUrl: url.originalUrl,
        title: url.title,
        clicks: url.clicks.length,
        hitCount: url.hitCount,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5); // Top 5 URLs

    return {
      totalUrls,
      totalClicks,
      totalUniqueClicks,
      topUrls,
      urls,
    };
  }

  /**
   * Get global analytics across all URLs and users
   * @param days - Number of days to look back (default: 30)
   * @returns Promise with global analytics data
   */
  async getGlobalAnalytics(days: number = 30) {
    // Calculate the date threshold for filtering
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get basic counts
    const totalUrls = await this.prisma.url.count();
    const totalClicks = await this.prisma.click.count({
      where: {
        clickedAt: {
          gte: dateThreshold,
        },
      },
    });
    const totalUsers = await this.prisma.user.count();

    // Get top countries
    const topCountries = await this.prisma.click.groupBy({
      by: ["country"],
      where: {
        clickedAt: {
          gte: dateThreshold,
        },
        country: {
          not: null,
        },
      },
      _count: {
        country: true,
      },
      orderBy: {
        _count: {
          country: "desc",
        },
      },
      take: 5,
    });

    // Get top referrers
    const topReferrers = await this.prisma.click.groupBy({
      by: ["referrer"],
      where: {
        clickedAt: {
          gte: dateThreshold,
        },
        referrer: {
          not: null,
        },
      },
      _count: {
        referrer: true,
      },
      orderBy: {
        _count: {
          referrer: "desc",
        },
      },
      take: 5,
    });

    return {
      totalUrls,
      totalClicks,
      totalUsers,
      topCountries: topCountries.map((item) => ({
        country: item.country,
        count: item._count.country,
      })),
      topReferrers: topReferrers.map((item) => ({
        referrer: item.referrer,
        count: item._count.referrer,
      })),
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Aggregate click data by a specific field
   * @param clicks - Array of click records
   * @param fieldName - The field to aggregate by
   * @returns Object with field values as keys and counts as values
   */
  private aggregateByField(
    clicks: any[],
    fieldName: string,
  ): Record<string, number> {
    const aggregation: Record<string, number> = {};

    clicks.forEach((click) => {
      const value = click[fieldName];
      if (value) {
        aggregation[value] = (aggregation[value] || 0) + 1;
      }
    });

    return aggregation;
  }
}
