import { Router } from "express";
import {
  shortenUrl,
  redirectToUrl,
  getUserUrls,
  deleteUrl,
} from "../controllers/url.controller";
import { authenticateToken, optionalAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Shorten a URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: The long URL to be shortened
 *                 example: "https://example.com/very/long/url/that/needs/shortening"
 *               title:
 *                 type: string
 *                 description: Custom title for the URL
 *                 example: "My Custom URL"
 *               description:
 *                 type: string
 *                 description: Custom description for the URL
 *                 example: "A description for my shortened URL"
 *     responses:
 *       200:
 *         description: URL shortened successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slug:
 *                   type: string
 *                   description: The generated short URL slug
 *                   example: "abc123"
 *                 shortUrl:
 *                   type: string
 *                   format: uri
 *                   description: The complete short URL
 *                   example: "http://localhost:3000/abc123"
 *       400:
 *         description: Invalid URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/api/shorten", optionalAuth, asyncHandler(shortenUrl));

/**
 * @swagger
 * /api/urls:
 *   get:
 *     summary: Get user's URLs
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's URLs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 urls:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Url'
 *                 count:
 *                   type: integer
 *                   description: Number of URLs returned
 *       401:
 *         description: Authentication required
 */
router.get("/api/urls", authenticateToken, asyncHandler(getUserUrls));

/**
 * @swagger
 * /api/urls/{slug}:
 *   delete:
 *     summary: Delete a URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL slug to delete
 *     responses:
 *       200:
 *         description: URL deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "URL deleted successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: URL not found
 */
router.delete("/api/urls/:slug", authenticateToken, asyncHandler(deleteUrl));

/**
 * @swagger
 * /{slug}:
 *   get:
 *     summary: Redirect to original URL
 *     tags: [URLs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Short URL slug
 *     responses:
 *       302:
 *         description: Redirect to original URL
 *       404:
 *         description: URL not found
 */
router.get("/:slug", asyncHandler(redirectToUrl));

export default router;
