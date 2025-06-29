import { Request, Response } from "express";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import { UrlRepository } from "../repositories/url.repository";
import logger from "../config/logger";

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

export class AnalyticsController {
  private analyticsRepository: AnalyticsRepository;
  private urlRepository: UrlRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
    this.urlRepository = new UrlRepository();
  }

  async getUrlAnalytics(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const { days = "30" } = req.query;
      const userId = req.user?.id;

      const url = await this.urlRepository.findBySlug(slug);
      if (!url) {
        return res.status(404).json({
          error: "URL not found",
        });
      }

      // Check if user owns this URL or if it's public
      if (url.userId && url.userId !== userId) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      const analytics = await this.analyticsRepository.getUrlAnalytics(
        url.id,
        parseInt(days as string),
      );

      logger.info("URL analytics retrieved", {
        slug,
        userId,
        totalClicks: analytics.totalClicks,
      });

      res.json({
        url: {
          slug: url.slug,
          originalUrl: url.originalUrl,
          title: url.title,
          createdAt: url.createdAt,
        },
        analytics,
      });
    } catch (error) {
      logger.error("Get URL analytics failed", {
        error: (error as Error).message,
      });
      res.status(500).json({
        error: "Failed to retrieve analytics",
      });
    }
  }

  async getUserAnalytics(req: AuthRequest, res: Response) {
    try {
      const { days = "30" } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const analytics = await this.analyticsRepository.getUserAnalytics(
        userId,
        parseInt(days as string),
      );

      logger.info("User analytics retrieved", {
        userId,
        totalUrls: analytics.totalUrls,
        totalClicks: analytics.totalClicks,
      });

      res.json({
        analytics,
      });
    } catch (error) {
      logger.error("Get user analytics failed", {
        error: (error as Error).message,
      });
      res.status(500).json({
        error: "Failed to retrieve analytics",
      });
    }
  }

  async getGlobalAnalytics(req: Request, res: Response) {
    try {
      const { days = "30" } = req.query;

      const analytics = await this.analyticsRepository.getGlobalAnalytics(
        parseInt(days as string),
      );

      logger.info("Global analytics retrieved", {
        totalUrls: analytics.totalUrls,
        totalClicks: analytics.totalClicks,
        totalUsers: analytics.totalUsers,
      });

      res.json({
        analytics,
      });
    } catch (error) {
      logger.error("Get global analytics failed", {
        error: (error as Error).message,
      });
      res.status(500).json({
        error: "Failed to retrieve analytics",
      });
    }
  }

  async trackClick(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      const url = await this.urlRepository.findBySlug(slug);
      if (!url) {
        return res.status(404).json({
          error: "URL not found",
        });
      }

      // Extract click data from request
      const clickData = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referrer: req.get("Referer"),
        // Note: For production, you'd want to use a service like MaxMind or IP-API
        // to get geographic and device information
        country: req.get("CF-IPCountry") || null, // Cloudflare header
        city: null,
        region: null,
        timezone: null,
        deviceType: this.getDeviceType(req.get("User-Agent") || ""),
        browser: this.getBrowser(req.get("User-Agent") || ""),
        os: this.getOS(req.get("User-Agent") || ""),
        language: req.get("Accept-Language")?.split(",")[0] || null,
      };

      // Track the click
      await this.analyticsRepository.trackClick(url.id, userId, clickData);

      // Update URL hit count
      await this.urlRepository.incrementHitCount(slug);

      logger.info("Click tracked", {
        slug,
        userId,
        ipAddress: clickData.ipAddress,
      });

      res.json({
        message: "Click tracked successfully",
      });
    } catch (error) {
      logger.error("Track click failed", { error: (error as Error).message });
      res.status(500).json({
        error: "Failed to track click",
      });
    }
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile")) return "mobile";
    if (ua.includes("tablet")) return "tablet";
    return "desktop";
  }

  private getBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes("chrome")) return "Chrome";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari")) return "Safari";
    if (ua.includes("edge")) return "Edge";
    if (ua.includes("opera")) return "Opera";
    return "Unknown";
  }

  private getOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac")) return "macOS";
    if (ua.includes("linux")) return "Linux";
    if (ua.includes("android")) return "Android";
    if (ua.includes("ios")) return "iOS";
    return "Unknown";
  }
}
