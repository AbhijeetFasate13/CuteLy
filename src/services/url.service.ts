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
    const id = toBase10(slug);
    const url = await this.urlRepository.findById(id);
    if (!url) throw new Error("URL not found");
    await this.urlRepository.incrementHitCount(url.slug);
    return url.originalUrl;
  }
}
