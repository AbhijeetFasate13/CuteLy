import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import logger from "../config/logger";

// Extend Express Request to include user information from JWT
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

  /**
   * Shorten a URL and optionally associate it with the authenticated user
   * @param req - Express request with URL data and optional user authentication
   * @param res - Express response
   */
  async shortenUrl(req: AuthRequest, res: Response) {
    try {
      const { url, title, description } = req.body;
      const userId = req.user?.id; // Get user ID from JWT token if authenticated

      // Validate required fields
      if (!url) {
        return res.status(400).json({
          error: "URL is required",
        });
      }

      // Basic URL format validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: "Invalid URL format",
        });
      }

      // Create shortened URL
      const result = await this.urlService.shortenUrl(
        url,
        userId,
        title,
        description,
      );

      // Construct the full short URL
      const shortUrl = `${req.protocol}://${req.get("host")}/${result.slug}`;

      logger.info("URL shortened successfully", {
        originalUrl: url,
        slug: result.slug,
        userId,
        title,
        description,
      });

      // Return the shortened URL details
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

  /**
   * Redirect to the original URL when a short URL is accessed
   * @param req - Express request with slug parameter
   * @param res - Express response
   */
  async redirectToUrl(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      // Validate slug parameter
      if (!slug) {
        return res.status(400).json({
          error: "Slug is required",
        });
      }

      // Get original URL and track the click
      const originalUrl = await this.urlService.getOriginalUrl(slug, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referrer: req.get("Referer"),
      });

      logger.info("URL redirect successful", {
        slug,
        originalUrl,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });

      // Redirect to the original URL
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

  /**
   * Get all URLs owned by the authenticated user
   * @param req - Express request with user authentication
   * @param res - Express response
   */
  async getUserUrls(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Check if user is authenticated
      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      // Get user's URLs
      const urls = await this.urlService.getUserUrls(userId);

      logger.info("User URLs retrieved", {
        userId,
        count: urls.length,
      });

      // Return user's URLs
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

  /**
   * Delete a URL (only if owned by the authenticated user)
   * @param req - Express request with slug parameter and user authentication
   * @param res - Express response
   */
  async deleteUrl(req: AuthRequest, res: Response) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      // Check if user is authenticated
      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      // Validate slug parameter
      if (!slug) {
        return res.status(400).json({
          error: "Slug is required",
        });
      }

      // Delete the URL (service will check ownership)
      await this.urlService.deleteUrl(slug, userId);

      logger.info("URL deleted successfully", {
        slug,
        userId,
      });

      // Return success message
      res.json({
        message: "URL deleted successfully",
      });
    } catch (error) {
      logger.error("URL deletion failed", {
        slug: req.params.slug,
        error: (error as Error).message,
      });

      // Handle specific error cases
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

// ===== EXPORTED ROUTE HANDLERS =====
// These are the actual functions used by the routes

const urlController = new UrlController();

/**
 * Route handler for shortening URLs
 */
export const shortenUrl = (req: AuthRequest, res: Response) => {
  urlController.shortenUrl(req, res);
};

/**
 * Route handler for URL redirects
 */
export const redirectToUrl = (req: Request, res: Response) => {
  urlController.redirectToUrl(req, res);
};

/**
 * Route handler for getting user's URLs
 */
export const getUserUrls = (req: AuthRequest, res: Response) => {
  urlController.getUserUrls(req, res);
};

/**
 * Route handler for deleting URLs
 */
export const deleteUrl = (req: AuthRequest, res: Response) => {
  urlController.deleteUrl(req, res);
};
