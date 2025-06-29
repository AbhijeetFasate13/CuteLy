import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import { shortenUrlSchema } from "../dto/url.dto";
import redis from "../config/redis";
import logger from "../config/logger";

interface AuthRequest extends Request {
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

  async shortenUrl(req: AuthRequest, res: Response) {
    try {
      const { url, title, description } = req.body;
      const userId = req.user?.id;

      if (!url) {
        return res.status(400).json({
          error: "URL is required",
        });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: "Invalid URL format",
        });
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

      res.json({
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
      res.status(500).json({
        error: "Failed to shorten URL",
      });
    }
  }

  async redirectToUrl(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      if (!slug) {
        return res.status(400).json({
          error: "Slug is required",
        });
      }

      const originalUrl = await this.urlService.getOriginalUrl(slug);

      logger.info("URL redirect successful", {
        slug,
        originalUrl,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });

      res.redirect(originalUrl);
    } catch (error) {
      logger.error("URL redirect failed", {
        slug: req.params.slug,
        error: (error as Error).message,
      });
      res.status(404).json({
        error: "URL not found",
      });
    }
  }

  async getUserUrls(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const urls = await this.urlService.getUserUrls(userId);

      logger.info("User URLs retrieved", {
        userId,
        count: urls.length,
      });

      res.json({
        urls,
        count: urls.length,
      });
    } catch (error) {
      logger.error("Get user URLs failed", { error: (error as Error).message });
      res.status(500).json({
        error: "Failed to retrieve user URLs",
      });
    }
  }

  async deleteUrl(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      if (!slug) {
        return res.status(400).json({
          error: "Slug is required",
        });
      }

      await this.urlService.deleteUrl(slug, userId);

      logger.info("URL deleted successfully", {
        slug,
        userId,
      });

      res.json({
        message: "URL deleted successfully",
      });
    } catch (error) {
      logger.error("URL deletion failed", {
        slug: req.params.slug,
        error: (error as Error).message,
      });

      if ((error as Error).message === "URL not found") {
        return res.status(404).json({
          error: "URL not found",
        });
      }

      if ((error as Error).message === "Access denied") {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      res.status(500).json({
        error: "Failed to delete URL",
      });
    }
  }
}

// Export controller instances for route handlers
const urlController = new UrlController();

export const shortenUrl = (req: AuthRequest, res: Response) => {
  urlController.shortenUrl(req, res);
};

export const redirectToUrl = (req: Request, res: Response) => {
  urlController.redirectToUrl(req, res);
};

export const getUserUrls = (req: AuthRequest, res: Response) => {
  urlController.getUserUrls(req, res);
};

export const deleteUrl = (req: AuthRequest, res: Response) => {
  urlController.deleteUrl(req, res);
};
