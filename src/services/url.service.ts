import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { UrlRepository } from "../repositories/url.repository";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import redis from "../config/redis";
import * as base62Util from "../utils/base62.util";
import logger from "../config/logger";
import {
  NotFoundError,
  DatabaseError,
  AuthorizationError,
} from "../utils/errors";
import config from "../config/app.config";

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
export class UrlService {
  constructor(
    @inject("UrlRepository") private urlRepository: UrlRepository,
    @inject("AnalyticsRepository")
    private analyticsRepository: AnalyticsRepository,
  ) {}

  /**
   * Shorten a URL and optionally associate it with a user
   * @param originalUrl - The long URL to shorten
   * @param userId - Optional user ID for ownership
   * @param title - Optional title for the URL
   * @param description - Optional description for the URL
   * @returns Promise with the shortened URL details
   */
  async shortenUrl(
    originalUrl: string,
    userId?: number,
    title?: string,
    description?: string,
  ) {
    try {
      // Check cache for long URL to slug mapping (only for non-user URLs)
      if (!userId) {
        const cachedSlug = await redis.get(`long:${originalUrl}`);
        if (cachedSlug) {
          logger.info("Returning cached slug for long URL (from cache)", {
            originalUrl,
            slug: cachedSlug,
          });
          return { slug: cachedSlug };
        }
        // If not in cache, check DB
        const existingUrl =
          await this.urlRepository.findByOriginalUrl(originalUrl);
        if (existingUrl) {
          logger.info("Returning cached slug for long URL", {
            originalUrl,
            slug: existingUrl.slug,
          });
          // Cache the mapping for future requests
          await this.cacheLongUrl(originalUrl, existingUrl.slug);
          return { slug: existingUrl.slug };
        }
      }

      // Create new URL record
      const urlRecord = await this.urlRepository.createUrl(
        originalUrl,
        userId,
        title,
        description,
      );

      // Generate unique slug
      const slug = await this.generateUniqueSlug(urlRecord.id);

      // Update URL with slug
      await this.urlRepository.updateSlug(urlRecord.id, slug);

      // Cache the URL (only for non-user URLs)
      if (!userId) {
        await this.cacheUrl(slug, originalUrl);
        await this.cacheLongUrl(originalUrl, slug);
      }

      logger.info("URL shortened successfully", {
        originalUrl,
        slug,
        userId,
        title,
        description,
      });

      return { slug };
    } catch (error) {
      logger.error("URL shortening failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get the original URL for a given slug and track the click
   * @param slug - The short URL slug
   * @param clickData - Optional click tracking data
   * @returns Promise with the original URL
   */
  async getOriginalUrl(slug: string, clickData?: ClickData) {
    try {
      // Try to get from cache first
      const cachedUrl = await redis.get(`short:${slug}`);
      if (cachedUrl) {
        logger.debug("URL retrieved from cache", { slug });
        await this.trackClick(slug, clickData);
        return cachedUrl;
      }

      // Get from database
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) {
        throw new NotFoundError("URL not found");
      }

      // Update hit count and last accessed time
      await this.urlRepository.incrementHitCount(slug);

      // Track analytics if click data provided
      if (clickData) {
        await this.trackClick(slug, clickData);
      }

      // Cache the URL
      await this.cacheUrl(slug, urlRecord.originalUrl);

      return urlRecord.originalUrl;
    } catch (error) {
      logger.error("Failed to get original URL", {
        slug,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all URLs owned by a specific user
   * @param userId - The user's ID
   * @returns Promise with array of user's URLs
   */
  async getUserUrls(userId: number) {
    try {
      const urls = await this.urlRepository.getUserUrls(userId);
      logger.info("Retrieved user URLs", { userId, count: urls.length });
      return urls;
    } catch (error) {
      logger.error("Failed to get user URLs", {
        userId,
        error: (error as Error).message,
      });
      throw new DatabaseError("Failed to retrieve user URLs");
    }
  }

  /**
   * Delete a URL (only if owned by the user)
   * @param slug - The URL slug to delete
   * @param userId - The user requesting deletion
   * @returns Promise indicating success
   */
  async deleteUrl(slug: string, userId: number) {
    try {
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) {
        throw new NotFoundError("URL not found");
      }

      if (urlRecord.userId !== userId) {
        throw new AuthorizationError("Access denied");
      }

      await this.urlRepository.deleteUrl(urlRecord.id);

      // Remove from cache
      await redis.del(`short:${slug}`);
      await redis.del(`long:${urlRecord.originalUrl}`);

      logger.info("URL deleted successfully", { slug, userId });
    } catch (error) {
      logger.error("Failed to delete URL", {
        slug,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate a unique slug for a URL
   * @param urlId - The ID of the URL
   * @returns Promise with unique slug
   */
  private async generateUniqueSlug(urlId: number): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const slug = base62Util.toBase62(urlId + attempts);

      const existingUrl = await this.urlRepository.findBySlug(slug);
      if (!existingUrl) {
        return slug;
      }

      attempts++;
    }

    throw new Error("Failed to generate unique slug");
  }

  /**
   * Cache a URL mapping
   * @param slug - The short URL slug
   * @param originalUrl - The original long URL
   */
  private async cacheUrl(slug: string, originalUrl: string): Promise<void> {
    try {
      await redis.setex(`short:${slug}`, config.get("redis.ttl"), originalUrl);
      logger.debug("URL cached successfully", { slug });
    } catch (error) {
      logger.warn("Failed to cache URL", {
        slug,
        error: (error as Error).message,
      });
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Cache a long URL to slug mapping
   * @param originalUrl - The original long URL
   * @param slug - The short URL slug
   */
  private async cacheLongUrl(originalUrl: string, slug: string): Promise<void> {
    try {
      await redis.setex(`long:${originalUrl}`, config.get("redis.ttl"), slug);
      logger.debug("Long URL cached successfully", { originalUrl, slug });
    } catch (error) {
      logger.warn("Failed to cache long URL", {
        originalUrl,
        error: (error as Error).message,
      });
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Track click analytics
   * @param slug - The short URL slug
   * @param clickData - Optional click tracking data
   */
  private async trackClick(slug: string, clickData?: ClickData): Promise<void> {
    if (!clickData) return;

    try {
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) return;

      await this.analyticsRepository.trackClick(
        urlRecord.id,
        urlRecord.userId,
        clickData,
      );
    } catch (error) {
      logger.warn("Failed to track click", {
        slug,
        error: (error as Error).message,
      });
      // Don't throw - analytics failure shouldn't break the main flow
    }
  }
}
