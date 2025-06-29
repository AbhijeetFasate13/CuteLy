/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import logger from "../config/logger";

// Extend Express Request to include user information from JWT
interface AuthRequest extends Omit<Request, "get"> {
  protocol: string;
  get(name: string): string | string[] | undefined;
  body: any;
  params: any;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

export class UrlController {
  private urlService: UrlService;

  constructor() {
    this.urlService = new UrlService();
  }

  /**
   * Shorten a URL and optionally associate it with the authenticated user
   */
  async shortenUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { url, title, description } = req.body;
      const userId = req.user?.id;
      if (!url) {
        (res as any).status(400).json({ error: "URL is required" });
        return;
      }
      try {
        new URL(url);
      } catch {
        (res as any).status(400).json({ error: "Invalid URL format" });
        return;
      }
      const result = await this.urlService.shortenUrl(
        url,
        userId,
        title,
        description,
      );
      const shortUrl = `${req.protocol}://${req.get("host")}/${result.slug}`;
      logger.info("URL shortened successfully", {
        originalUrl: url,
        slug: result.slug,
        userId,
        title,
        description,
      });
      (res as any).json({
        slug: result.slug,
        shortUrl,
        originalUrl: url,
        title,
        description,
      });
    } catch (error) {
      logger.error("URL shortening failed", {
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to shorten URL" });
    }
  }

  /**
   * Redirect to the original URL when a short URL is accessed
   */
  async redirectToUrl(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = (req as any).params;
      if (!slug) {
        (res as any).status(400).json({ error: "Slug is required" });
        return;
      }
      const originalUrl = await this.urlService.getOriginalUrl(slug, {
        ipAddress: (req as any).ip,
        userAgent: (req as any).get("User-Agent"),
        referrer: (req as any).get("Referer"),
      });
      logger.info("URL redirect successful", {
        slug,
        originalUrl,
        userAgent: (req as any).get("User-Agent"),
        ip: (req as any).ip,
      });
      (res as any).redirect(originalUrl);
    } catch (error) {
      logger.error("URL redirect failed", {
        slug: (req as any).params.slug,
        error: (error as Error).message,
      });
      (res as any).status(404).json({ error: "URL not found" });
    }
  }

  /**
   * Get all URLs owned by the authenticated user
   */
  async getUserUrls(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }
      const urls = await this.urlService.getUserUrls(userId);
      logger.info("User URLs retrieved", { userId, count: urls.length });
      (res as any).json({ urls, count: urls.length });
    } catch (error) {
      logger.error("Get user URLs failed", { error: (error as Error).message });
      (res as any).status(500).json({ error: "Failed to retrieve user URLs" });
    }
  }

  /**
   * Delete a URL (only if owned by the authenticated user)
   */
  async deleteUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        (res as any).status(401).json({ error: "Authentication required" });
        return;
      }
      if (!slug) {
        (res as any).status(400).json({ error: "Slug is required" });
        return;
      }
      await this.urlService.deleteUrl(slug, userId);
      logger.info("URL deleted successfully", { slug, userId });
      (res as any).json({ message: "URL deleted successfully" });
    } catch (error) {
      logger.error("URL deletion failed", {
        slug: req.params.slug,
        error: (error as Error).message,
      });
      if ((error as Error).message === "URL not found") {
        (res as any).status(404).json({ error: "URL not found" });
        return;
      }
      if ((error as Error).message === "Access denied") {
        (res as any).status(403).json({ error: "Access denied" });
        return;
      }
      (res as any).status(500).json({ error: "Failed to delete URL" });
    }
  }
}

const urlController = new UrlController();

export const shortenUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await urlController.shortenUrl(req as AuthRequest, res);
};

export const redirectToUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await urlController.redirectToUrl(req, res);
};

export const getUserUrls = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await urlController.getUserUrls(req as AuthRequest, res);
};

export const deleteUrl = async (req: Request, res: Response): Promise<void> => {
  await urlController.deleteUrl(req as AuthRequest, res);
};
