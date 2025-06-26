import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import { shortenUrlSchema } from "../dto/url.dto";
import redis from "../config/redis";
import logger from "../config/logger";

const urlService = new UrlService();

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Create a short URL from a long URL
 *     description: Converts a long URL to a short, memorable slug. If the same URL is shortened multiple times, the same slug is returned (idempotent).
 *     tags: [URL Shortening]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShortenUrlRequest'
 *     responses:
 *       201:
 *         description: URL successfully shortened
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortenUrlResponse'
 *       400:
 *         description: Invalid URL format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const shortenUrl = async (req: Request, res: Response) => {
  const ip = req.ip;
  const key = `rate:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    if (count > 10) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ error: "Too many requests, slow down!" });
    }

    const parseResult = shortenUrlSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn(`Invalid URL format: ${req.body.url}`);
      return res.status(400).json({ error: "Invalid URL" });
    }

    const { url } = parseResult.data;
    logger.info(`Shortening URL: ${url}`, {
      ip,
      userAgent: req.get("User-Agent"),
    });

    const { slug } = await urlService.shortenUrl(url);
    const shortUrl = `${req.protocol}://${req.get("host")}/${slug}`;

    logger.info(`URL shortened successfully: ${url} -> ${slug}`);
    return res.status(201).json({ slug, shortUrl });
  } catch (err) {
    logger.error("Error shortening URL", {
      error: err instanceof Error ? err.message : "Unknown error",
      ip,
      url: req.body.url,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /{slug}:
 *   get:
 *     summary: Redirect to original URL
 *     description: Redirects the user to the original URL associated with the short slug
 *     tags: [URL Redirection]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The short URL slug
 *         example: abc123
 *     responses:
 *       302:
 *         description: Redirects to the original URL
 *       404:
 *         description: Slug not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const redirectToUrl = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    logger.info(`Redirecting slug: ${slug}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    const originalUrl = await urlService.getOriginalUrl(slug);
    logger.info(`Redirect successful: ${slug} -> ${originalUrl}`);
    return res.redirect(originalUrl);
  } catch {
    logger.warn(`Slug not found: ${slug}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(404).json({ error: "URL not found" });
  }
};
