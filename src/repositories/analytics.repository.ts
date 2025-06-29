import prismaClient from "config/prisma";

export class AnalyticsRepository {
  private prisma;
  constructor(prisma = prismaClient) {
    this.prisma = prisma;
  }

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

    // Aggregate data
    const totalClicks = clicks.length;
    const uniqueClicks = new Set(clicks.map((click) => click.ipAddress)).size;

    // Geographic data
    const countries = clicks.reduce(
      (acc, click) => {
        if (click.country) {
          acc[click.country] = (acc[click.country] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const cities = clicks.reduce(
      (acc, click) => {
        if (click.city) {
          acc[click.city] = (acc[click.city] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Device data
    const deviceTypes = clicks.reduce(
      (acc, click) => {
        if (click.deviceType) {
          acc[click.deviceType] = (acc[click.deviceType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const browsers = clicks.reduce(
      (acc, click) => {
        if (click.browser) {
          acc[click.browser] = (acc[click.browser] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const operatingSystems = clicks.reduce(
      (acc, click) => {
        if (click.os) {
          acc[click.os] = (acc[click.os] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Referrer data
    const referrers = clicks.reduce(
      (acc, click) => {
        if (click.referrer) {
          acc[click.referrer] = (acc[click.referrer] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Hourly data
    const hourlyClicks = clicks.reduce(
      (acc, click) => {
        const hour = new Date(click.clickedAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    // Daily data
    const dailyClicks = clicks.reduce(
      (acc, click) => {
        const date = new Date(click.clickedAt).toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalClicks,
      uniqueClicks,
      countries,
      cities,
      deviceTypes,
      browsers,
      operatingSystems,
      referrers,
      hourlyClicks,
      dailyClicks,
      recentClicks: clicks.slice(0, 10), // Last 10 clicks
    };
  }

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
    const totalUniqueClicks = new Set(
      urls.flatMap((url) => url.clicks.map((click) => click.ipAddress)),
    ).size;

    // Top performing URLs
    const topUrls = urls
      .map((url) => ({
        slug: url.slug,
        originalUrl: url.originalUrl,
        clicks: url.clicks.length,
        title: url.title,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    return {
      totalUrls,
      totalClicks,
      totalUniqueClicks,
      topUrls,
      urls: urls.map((url) => ({
        id: url.id,
        slug: url.slug,
        originalUrl: url.originalUrl,
        title: url.title,
        clicks: url.clicks.length,
        createdAt: url.createdAt,
      })),
    };
  }

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

    const topCountries = await this.prisma.click.groupBy({
      by: ["country"],
      where: {
        clickedAt: {
          gte: startDate,
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
      take: 10,
    });

    const topReferrers = await this.prisma.click.groupBy({
      by: ["referrer"],
      where: {
        clickedAt: {
          gte: startDate,
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
      take: 10,
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
}
