/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import { ShortenUrlSchema, DeleteUrlSchema } from "../dto/url.dto";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "../utils/errors";
import logger from "../config/logger";
import container from "../config/container";

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

@injectable()
export class UrlController {
  constructor(@inject("UrlService") private urlService: UrlService) {}

  /**
   * Shorten a URL and optionally associate it with the authenticated user
   */
  async shortenUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = ShortenUrlSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { url, title, description } = validationResult.data;
      const userId = req.user?.id;

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
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }

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
        throw new ValidationError("Slug is required");
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
      if (error instanceof NotFoundError) {
        (res as any).status(404).json({ error: "URL not found" });
        return;
      }

      logger.error("URL redirect failed", {
        slug: (req as any).params.slug,
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to redirect URL" });
    }
  }

  /**
   * Get all URLs owned by the authenticated user
   */
  async getUserUrls(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError("Authentication required");
      }

      const urls = await this.urlService.getUserUrls(userId);
      logger.info("User URLs retrieved", { userId, count: urls.length });
      (res as any).json({ urls, count: urls.length });
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(401).json({ error: error.message });
        return;
      }

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
        throw new ValidationError("Authentication required");
      }

      // Validate slug parameter
      const validationResult = DeleteUrlSchema.safeParse({ slug });
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new ValidationError(errors);
      }

      await this.urlService.deleteUrl(slug, userId);
      logger.info("URL deleted successfully", { slug, userId });
      (res as any).json({ message: "URL deleted successfully" });
    } catch (error) {
      if (error instanceof ValidationError) {
        (res as any).status(400).json({ error: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        (res as any).status(404).json({ error: "URL not found" });
        return;
      }
      if (error instanceof AuthorizationError) {
        (res as any).status(403).json({ error: "Access denied" });
        return;
      }

      logger.error("URL deletion failed", {
        slug: req.params.slug,
        error: (error as Error).message,
      });
      (res as any).status(500).json({ error: "Failed to delete URL" });
    }
  }
}

// Factory function to create controller instance
export function createUrlController(): UrlController {
  return new UrlController(container.resolve("UrlService"));
}

// Export controller functions for routes
export const shortenUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createUrlController();
  await controller.shortenUrl(req as AuthRequest, res);
};

export const redirectToUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createUrlController();
  await controller.redirectToUrl(req, res);
};

export const getUserUrls = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const controller = createUrlController();
  await controller.getUserUrls(req as AuthRequest, res);
};

export const deleteUrl = async (req: Request, res: Response): Promise<void> => {
  const controller = createUrlController();
  await controller.deleteUrl(req as AuthRequest, res);
};
