import { Router } from "express";
import { shortenUrl, redirectToUrl } from "../controllers/url.controller";

const router = Router();

router.post("/api/shorten", (req, res) => {
  shortenUrl(req, res);
});
router.get("/:slug", (req, res) => {
  redirectToUrl(req, res);
});

export default router;
