import express from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  trackClick,
  getUrlAnalytics,
  getUserAnalytics,
  getGlobalAnalytics,
} from "../controllers/analytics.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

/**
 * @swagger
 * /api/analytics/url/{slug}:
 *   get:
 *     summary: Get analytics for a specific URL
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL slug
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       404:
 *         description: URL not found
 *       403:
 *         description: Access denied
 */
router.get(
  "/api/analytics/url/:slug",
  authenticateToken,
  asyncHandler(getUrlAnalytics),
);

/**
 * @swagger
 * /api/analytics/user:
 *   get:
 *     summary: Get analytics for the authenticated user
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  "/api/analytics/user",
  authenticateToken,
  asyncHandler(getUserAnalytics),
);

/**
 * @swagger
 * /api/analytics/global:
 *   get:
 *     summary: Get global analytics (public)
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Global analytics retrieved successfully
 */
router.get(
  "/api/analytics/global",
  authenticateToken,
  asyncHandler(getGlobalAnalytics),
);

/**
 * @swagger
 * /api/analytics/track/{slug}:
 *   post:
 *     summary: Track a click on a URL
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL slug
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Click tracked successfully
 *       404:
 *         description: URL not found
 */
router.post("/track/:urlId", asyncHandler(trackClick));

export default router;
