import express from "express";
import { authenticateToken, verifyToken } from "../middleware/auth.middleware";
import {
  shortenUrl,
  redirectToUrl,
  getUserUrls,
  deleteUrl,
} from "../controllers/url.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Shorten a URL
 *     tags: [URLs]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: URL shortened successfully
 *       400:
 *         description: Invalid URL format
 */
router.post(
  "/shorten",
  verifyToken, // Optional authentication
  asyncHandler(shortenUrl),
);

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
 *     responses:
 *       302:
 *         description: Redirect to original URL
 *       404:
 *         description: URL not found
 */
router.get("/:slug", asyncHandler(redirectToUrl));

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
 *       401:
 *         description: Authentication required
 */
router.get("/urls", authenticateToken, asyncHandler(getUserUrls));

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
 *     responses:
 *       200:
 *         description: URL deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: URL not found
 */
router.delete("/urls/:slug", authenticateToken, asyncHandler(deleteUrl));

export default router;
