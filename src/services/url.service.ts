import { UrlRepository } from "../repositories/url.repository";
import { toBase10, toBase62 } from "../utils/base62.util";

export class UrlService {
  private urlRepository: UrlRepository;

  constructor() {
    this.urlRepository = new UrlRepository();
  }

  async shortenUrl(originalUrl: string): Promise<{ slug: string }> {
    // 1. Create the URL row (without slug)
    const url = await this.urlRepository.createUrl(originalUrl);
    // 2. Generate slug from the auto-incremented ID
    const slug = toBase62(url.id);
    // 3. Update the row with the slug
    await this.urlRepository.updateSlug(url.id, slug);
    return { slug };
  }

  async getOriginalUrl(slug: string): Promise<string> {
    let id: number;
    try {
      id = toBase10(slug);
    } catch {
      throw new Error("URL not found");
    }
    // If id is not a safe integer, treat as not found
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error("URL not found");
    }
    try {
      const url = await this.urlRepository.findById(id);
      if (!url) throw new Error("URL not found");
      await this.urlRepository.incrementHitCount(url.slug);
      return url.originalUrl;
    } catch {
      throw new Error("URL not found");
    }
  }
}
