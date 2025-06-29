/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import logger from "../config/logger";
import container from "../config/container";

// Extend Express Request to include user information from JWT
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

@injectable()
export class AnalyticsController {
  constructor(
    @inject("AnalyticsRepository")
    private analyticsRepository: AnalyticsRepository,
  ) {}

  /**
   * Track a click on a URL
   */
  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { urlId } = req.params;
      const userId = (req as AuthRequest).user?.id || null;

      const clickData = {
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        referrer: req.get("Referer") || undefined,
        country: undefined,
        city: undefined,
        region: undefined,
        timezone: undefined,
        deviceType: this.getDeviceType(req.get("User-Agent") || ""),
        browser: this.getBrowser(req.get("User-Agent") || ""),
        os: this.getOS(req.get("User-Agent") || ""),
        language: req.get("Accept-Language") || undefined,
      };

      await this.analyticsRepository.trackClick(
        parseInt(urlId),
        userId,
        clickData,
      );

      logger.info("Click tracked successfully", { urlId, userId });
      (res as any).json({ message: "Click tracked successfully" });
    } catch (error) {
      logger.error("Failed to track click", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to track click" });
    }
  }

  /**
   * Get analytics for a specific URL
   */
  async getUrlAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { urlId } = req.params;
      const { days = 30 } = req.query;

      const analytics = await this.analyticsRepository.getUrlAnalytics(
        parseInt(urlId),
        parseInt(days as string),
      );

      logger.info("URL analytics retrieved", { urlId, days });
      (res as any).json(analytics);
    } catch (error) {
      logger.error("Failed to get URL analytics", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to get URL analytics" });
    }
  }

  /**
   * Get analytics for the authenticated user
   */
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }

      const { days = 30 } = req.query;

      const analytics = await this.analyticsRepository.getUserAnalytics(
        userId,
        parseInt(days as string),
      );

      logger.info("User analytics retrieved", { userId, days });
      (res as any).json(analytics);
    } catch (error) {
      logger.error("Failed to get user analytics", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to get user analytics" });
    }
  }

  /**
   * Get global analytics (admin only)
   */
  async getGlobalAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;

      const analytics = await this.analyticsRepository.getGlobalAnalytics(
        parseInt(days as string),
      );

      logger.info("Global analytics retrieved", { days });
      (res as any).json(analytics);
    } catch (error) {
      logger.error("Failed to get global analytics", {
        error: (error as Error).message,
      });
      (res as any)
        .status(500)
        .json({ error: "Failed to get global analytics" });
    }
  }

  // Helper methods for user agent parsing
  private getDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet/i.test(userAgent)) return "tablet";
    return "desktop";
  }

  private getBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return "Chrome";
    if (/firefox/i.test(userAgent)) return "Firefox";
    if (/safari/i.test(userAgent)) return "Safari";
    if (/edge/i.test(userAgent)) return "Edge";
    return "Unknown";
  }

  private getOS(userAgent: string): string {
    if (/windows/i.test(userAgent)) return "Windows";
    if (/macintosh/i.test(userAgent)) return "macOS";
    if (/linux/i.test(userAgent)) return "Linux";
    if (/android/i.test(userAgent)) return "Android";
    if (/ios/i.test(userAgent)) return "iOS";
    return "Unknown";
  }
}

// Factory function to create controller instance
export function createAnalyticsController(): AnalyticsController {
  return new AnalyticsController(container.resolve("AnalyticsRepository"));
}

// Export controller functions for routes
export const trackClick = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAnalyticsController();
  await controller.trackClick(req, res);
};

export const getUrlAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAnalyticsController();
  await controller.getUrlAnalytics(req, res);
};

export const getUserAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAnalyticsController();
  await controller.getUserAnalytics(req, res);
};

export const getGlobalAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createAnalyticsController();
  await controller.getGlobalAnalytics(req, res);
};
