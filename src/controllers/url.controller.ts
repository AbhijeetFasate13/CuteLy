import { Request, Response } from "express";
import { UrlService } from "../services/url.service";
import { shortenUrlSchema } from "../dto/url.dto";

const urlService = new UrlService();

export const shortenUrl = async (req: Request, res: Response) => {
  const parseResult = shortenUrlSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  const { url } = parseResult.data;
  try {
    const { slug } = await urlService.shortenUrl(url);
    return res
      .status(201)
      .json({ slug, shortUrl: `${req.protocol}://${req.get("host")}/${slug}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const redirectToUrl = async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const originalUrl = await urlService.getOriginalUrl(slug);
    return res.redirect(originalUrl);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return res.status(404).json({ error: "URL not found" });
  }
};
