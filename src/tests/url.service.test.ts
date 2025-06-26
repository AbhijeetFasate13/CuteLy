import "dotenv/config";
import { expect, assert } from "chai";
import { UrlService } from "../services/url.service";
import redis from "../config/redis";

// Helper to spy on repository
import sinon from "sinon";
import { UrlRepository } from "../repositories/url.repository";

describe("UrlService", () => {
  const service = new UrlService();

  before(() => {
    redis.get = async () => null;
    redis.set = async () => "OK";
    redis.incr = async () => 1;
    redis.expire = async () => 1;
  });

  after(() => {
    // Close Redis connection to prevent hanging
    redis.disconnect();
  });

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

  it("should return cached value from Redis if present", async () => {
    // Arrange
    const slug = "abc123";
    const cachedUrl = "https://cached.com";
    // First call: cache miss, so DB is hit
    redis.get = async () => null;
    const repoSpy = sinon.spy(UrlRepository.prototype, "findById");
    try {
      await service.getOriginalUrl(slug); // ignore result, just to simulate DB hit
    } catch {
      // Expected to fail since slug doesn't exist in DB
    }
    assert.isTrue(repoSpy.called, "Repo should be called on cache miss");
    repoSpy.resetHistory();
    // Second call: cache hit
    redis.get = async () => cachedUrl;
    const result = await service.getOriginalUrl(slug);
    expect(result).to.equal(cachedUrl);
    assert.isFalse(repoSpy.called, "Repo should not be called on cache hit");
    repoSpy.restore();
  });
});
