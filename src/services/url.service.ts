import { UrlRepository } from "../repositories/url.repository";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import { generateSlug } from "../utils/base62.util";
import redis from "../config/redis";
import logger from "../config/logger";

export class UrlService {
  private urlRepository: UrlRepository;
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.urlRepository = new UrlRepository();
    this.analyticsRepository = new AnalyticsRepository();
  }

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
      // Check if URL already exists for this user (or globally if no user)
      const existingUrl =
        await this.urlRepository.findByOriginalUrl(originalUrl);

      if (existingUrl) {
        // If URL exists and belongs to the same user, return existing slug
        if (existingUrl.userId === userId) {
          logger.info("Returning existing URL for same user", {
            originalUrl,
            slug: existingUrl.slug,
            userId,
          });
          return existingUrl;
        }

        // If URL exists but belongs to different user, create new entry
        // This allows same URL to have different slugs for different users
        if (userId) {
          logger.info("Creating new slug for same URL but different user", {
            originalUrl,
            existingSlug: existingUrl.slug,
            userId,
          });
        }
      }

      // Generate a unique slug
      const slug = await this.generateUniqueSlug();

      // Create the URL record
      const urlRecord = await this.urlRepository.createUrl(
        originalUrl,
        userId,
        title,
        description,
      );

      // Update the record with the generated slug
      const finalUrlRecord = await this.urlRepository.updateSlug(
        urlRecord.id,
        slug,
      );

      // Cache the slug-to-URL mapping for faster redirects
      if (!userId) {
        // Only cache anonymous URLs to avoid conflicts
        await this.cacheUrlMapping(slug, originalUrl);
      }

      logger.info("URL shortened successfully", {
        originalUrl,
        slug,
        userId,
        title,
        description,
      });

      return finalUrlRecord;
    } catch (error) {
      logger.error("Failed to shorten URL", {
        originalUrl,
        userId,
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
  async getOriginalUrl(
    slug: string,
    clickData?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      userId?: number;
    },
  ) {
    try {
      // Try to get URL from cache first
      const cachedUrl = await this.getCachedUrl(slug);
      if (cachedUrl) {
        await this.trackClick(slug, clickData);
        return cachedUrl;
      }

      // If not in cache, get from database
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) {
        throw new Error("URL not found");
      }

      // Update hit count and last accessed time
      await this.urlRepository.incrementHitCount(slug);

      // Track the click with analytics
      await this.trackClick(slug, clickData);

      // Cache the URL for future requests
      await this.cacheUrlMapping(slug, urlRecord.originalUrl);

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
      const userUrls = await this.urlRepository.getUserUrls(userId);

      logger.info("Retrieved user URLs", {
        userId,
        urlCount: userUrls.length,
      });

      return userUrls;
    } catch (error) {
      logger.error("Failed to get user URLs", {
        userId,
        error: (error as Error).message,
      });
      throw error;
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
      // Find the URL to check ownership
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) {
        throw new Error("URL not found");
      }

      // Check if user owns this URL
      if (urlRecord.userId !== userId) {
        throw new Error("Access denied");
      }

      // Delete the URL
      await this.urlRepository.deleteUrl(urlRecord.id);

      // Remove from cache
      await this.removeFromCache(slug);

      logger.info("URL deleted successfully", {
        slug,
        userId,
        originalUrl: urlRecord.originalUrl,
      });
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
   * Generate a unique slug that doesn't already exist
   * @returns Promise with unique slug
   */
  private async generateUniqueSlug(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const slug = generateSlug();

      // Check if slug already exists
      const existingUrl = await this.urlRepository.findBySlug(slug);
      if (!existingUrl) {
        return slug;
      }

      attempts++;
      logger.warn("Slug collision detected, generating new slug", {
        slug,
        attempt: attempts,
      });
    }

    throw new Error("Failed to generate unique slug after maximum attempts");
  }

  /**
   * Cache a URL mapping for faster lookups
   * @param slug - The short URL slug
   * @param originalUrl - The original long URL
   */
  private async cacheUrlMapping(
    slug: string,
    originalUrl: string,
  ): Promise<void> {
    try {
      const cacheKey = `short:${slug}`;
      await redis.setex(cacheKey, 3600, originalUrl); // Cache for 1 hour

      logger.debug("URL cached successfully", { slug, originalUrl });
    } catch (error) {
      logger.warn("Failed to cache URL", {
        slug,
        originalUrl,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get a URL from cache
   * @param slug - The short URL slug
   * @returns Promise with cached URL or null
   */
  private async getCachedUrl(slug: string): Promise<string | null> {
    try {
      const cacheKey = `short:${slug}`;
      const cachedUrl = await redis.get(cacheKey);

      if (cachedUrl) {
        logger.debug("URL retrieved from cache", { slug });
      }

      return cachedUrl;
    } catch (error) {
      logger.warn("Failed to get URL from cache", {
        slug,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Remove a URL from cache
   * @param slug - The short URL slug
   */
  private async removeFromCache(slug: string): Promise<void> {
    try {
      const cacheKey = `short:${slug}`;
      await redis.del(cacheKey);

      logger.debug("URL removed from cache", { slug });
    } catch (error) {
      logger.warn("Failed to remove URL from cache", {
        slug,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Track a click with analytics data
   * @param slug - The short URL slug
   * @param clickData - Optional click tracking data
   */
  private async trackClick(
    slug: string,
    clickData?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      userId?: number;
    },
  ): Promise<void> {
    try {
      const urlRecord = await this.urlRepository.findBySlug(slug);
      if (!urlRecord) {
        return; // URL doesn't exist, skip tracking
      }

      await this.analyticsRepository.trackClick(
        urlRecord.id,
        clickData?.userId || null,
        {
          ipAddress: clickData?.ipAddress,
          userAgent: clickData?.userAgent,
          referrer: clickData?.referrer,
        },
      );

      logger.debug("Click tracked successfully", {
        slug,
        urlId: urlRecord.id,
        userId: clickData?.userId,
      });
    } catch (error) {
      logger.warn("Failed to track click", {
        slug,
        error: (error as Error).message,
      });
    }
  }
}
