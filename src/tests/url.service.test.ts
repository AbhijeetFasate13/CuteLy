import "dotenv/config";
import { expect } from "chai";
import { UrlService } from "../services/url.service";

describe("UrlService", () => {
  const service = new UrlService();

  it("should generate a short URL slug for a valid URL", async () => {
    const { slug } = await service.shortenUrl("https://example.com");
    expect(slug).to.be.a("string").with.lengthOf(6);
  });

  it("should throw for a non-existent slug", async () => {
    try {
      await service.getOriginalUrl("notarealslug");
      throw new Error("Should have thrown");
    } catch (err) {
      expect((err as Error).message).to.equal("URL not found");
    }
  });
});
