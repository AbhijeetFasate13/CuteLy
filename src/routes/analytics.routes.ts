import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authenticateToken, optionalAuth } from "../middleware/auth.middleware";

const router = Router();
const analyticsController = new AnalyticsController();

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
router.get("/api/analytics/url/:slug", optionalAuth, (req, res) => {
  analyticsController.getUrlAnalytics(req, res);
});

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
router.get("/api/analytics/user", authenticateToken, (req, res) => {
  analyticsController.getUserAnalytics(req, res);
});

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
router.get("/api/analytics/global", (req, res) => {
  analyticsController.getGlobalAnalytics(req, res);
});

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
router.post("/api/analytics/track/:slug", optionalAuth, (req, res) => {
  analyticsController.trackClick(req, res);
});

export default router;
