import { UrlRepository } from "../repositories/url.repository";
import { toBase10, toBase62 } from "../utils/base62.util";
import redis from "../config/redis";
import logger from "../config/logger";

export class UrlService {
  private urlRepository: UrlRepository;

  constructor() {
    this.urlRepository = new UrlRepository();
  }

  async shortenUrl(
    originalUrl: string,
    userId?: number,
    title?: string,
    description?: string,
  ): Promise<{ slug: string }> {
    logger.debug("Starting URL shortening process", { originalUrl, userId });

    // 1. Try cache (only for anonymous URLs)
    if (!userId) {
      const cachedSlug = await redis.get(`long:${originalUrl}`);
      if (cachedSlug) {
        logger.debug("Cache hit for URL shortening", {
          originalUrl,
          slug: cachedSlug,
        });
        return { slug: cachedSlug };
      }
    }

    // 2. Check if URL already exists in DB
    const existingUrl = await this.urlRepository.findByOriginalUrl(originalUrl);
    if (existingUrl && existingUrl.slug) {
      // Cache for future (only for anonymous URLs)
      if (!userId) {
        await redis.set(`long:${originalUrl}`, existingUrl.slug, "EX", 60 * 60); // 1 hour TTL
      }
      logger.info("URL already exists, returning existing slug", {
        originalUrl,
        slug: existingUrl.slug,
        hitCount: existingUrl.hitCount,
      });
      return { slug: existingUrl.slug };
    }

    // 3. Create the URL row (without slug)
    const url = await this.urlRepository.createUrl(
      originalUrl,
      userId,
      title,
      description,
    );
    // 4. Generate slug from the auto-incremented ID
    const slug = toBase62(url.id);
    // 5. Update the row with the slug
    await this.urlRepository.updateSlug(url.id, slug);
    // 6. Cache the mapping (only for anonymous URLs)
    if (!userId) {
      await redis.set(`long:${originalUrl}`, slug, "EX", 60 * 60); // 1 hour TTL
    }

    logger.info("New URL shortened successfully", {
      originalUrl,
      slug,
      id: url.id,
      userId,
    });
    return { slug };
  }

  async getOriginalUrl(slug: string): Promise<string> {
    logger.debug("Starting URL lookup", { slug });

    // 1. Try cache
    const cached = await redis.get(`slug:${slug}`);
    if (cached) {
      logger.debug("Cache hit for URL lookup", { slug, originalUrl: cached });
      return cached;
    }

    // 2. Fallback to DB
    let id: number;
    try {
      id = toBase10(slug);
    } catch {
      logger.warn("Invalid slug format", { slug });
      throw new Error("URL not found");
    }

    if (!Number.isSafeInteger(id) || id < 1) {
      logger.warn("Invalid slug ID", { slug, id });
      throw new Error("URL not found");
    }

    try {
      const url = await this.urlRepository.findById(id);
      if (!url) {
        logger.warn("URL not found in database", { slug, id });
        throw new Error("URL not found");
      }

      await this.urlRepository.incrementHitCount(url.slug);
      // 3. Cache result
      await redis.set(`slug:${slug}`, url.originalUrl, "EX", 60 * 60); // 1 hour TTL

      logger.info("URL lookup successful", {
        slug,
        originalUrl: url.originalUrl,
        hitCount: url.hitCount + 1,
      });
      return url.originalUrl;
    } catch (err) {
      logger.error("Error during URL lookup", {
        slug,
        id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      throw new Error("URL not found");
    }
  }

  async getUserUrls(userId: number) {
    return this.urlRepository.getUserUrls(userId);
  }

  async deleteUrl(slug: string, userId: number) {
    const url = await this.urlRepository.findBySlug(slug);
    if (!url) {
      throw new Error("URL not found");
    }

    if (url.userId !== userId) {
      throw new Error("Access denied");
    }

    await this.urlRepository.deleteUrl(url.id);
    logger.info("URL deleted", { slug, userId });
  }
}
