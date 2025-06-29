import "dotenv/config";
import { expect, assert } from "chai";
import { UrlService } from "../services/url.service";
import redis from "../config/redis";
import prisma from "config/prisma";

// Helper to spy on repository
import sinon from "sinon";
import { UrlRepository } from "../repositories/url.repository";
import * as base62Util from "../utils/base62.util";
import { Url } from "@prisma/client"; // Strong typing for URL mocks

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

  it("should return the same short URL for the same long URL", async () => {
    // Reset Redis mocks for this test
    redis.get = async () => null;
    redis.set = async () => "OK";
    // Arrange
    const originalUrl = "https://example.com/same-url";
    const expectedSlug = base62Util.toBase62(1); // Use the real function
    const mockExistingUrl: Url = {
      id: 1,
      originalUrl,
      slug: expectedSlug,
      hitCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null,
      userId: null,
      title: null,
      description: null,
      isActive: true,
      updatedAt: new Date(),
    };

    // Mock the repository to simulate finding an existing URL
    const findByOriginalUrlStub = sinon.stub(
      UrlRepository.prototype,
      "findByOriginalUrl",
    );
    findByOriginalUrlStub.onFirstCall().resolves(null); // First call: URL doesn't exist
    findByOriginalUrlStub.onSecondCall().resolves(mockExistingUrl); // Second call: URL exists

    const createUrlStub = sinon.stub(UrlRepository.prototype, "createUrl");
    createUrlStub.resolves({
      id: 1,
      originalUrl,
      slug: "",
      hitCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null,
      userId: null,
      title: null,
      description: null,
      isActive: true,
      updatedAt: new Date(),
    } as Url);

    const updateSlugStub = sinon.stub(UrlRepository.prototype, "updateSlug");
    updateSlugStub.resolves(mockExistingUrl);

    try {
      // Act - First call (creates new URL)
      const firstResult = await service.shortenUrl(originalUrl);

      // Act - Second call (should return existing URL)
      const secondResult = await service.shortenUrl(originalUrl);

      // Assert
      expect(firstResult.slug).to.equal(expectedSlug);
      expect(secondResult.slug).to.equal(expectedSlug);
      expect(firstResult.slug).to.equal(secondResult.slug);

      // Verify that createUrl was only called once (for the first call)
      assert.isTrue(
        createUrlStub.calledOnce,
        "createUrl should only be called once",
      );
      assert.isTrue(
        findByOriginalUrlStub.calledTwice,
        "findByOriginalUrl should be called twice",
      );
    } finally {
      // Clean up stubs
      findByOriginalUrlStub.restore();
      createUrlStub.restore();
      updateSlugStub.restore();
    }
  });

  it("should use cache for repeated shorten requests for the same long URL", async () => {
    const originalUrl = "https://example.com/cached-url";
    const expectedSlug = base62Util.toBase62(2);

    // First call: cache miss, so DB is hit
    const cache: Record<string, string> = {};
    redis.get = async (key: string) => cache[key] || null;
    redis.set = async (key: string, value: string) => {
      cache[key] = value;
      return "OK";
    };

    // Mock repository for DB lookup and creation
    const findByOriginalUrlStub = sinon.stub(
      UrlRepository.prototype,
      "findByOriginalUrl",
    );
    findByOriginalUrlStub.onFirstCall().resolves(null); // Not in DB
    findByOriginalUrlStub.onSecondCall().resolves({
      id: 2,
      originalUrl,
      slug: expectedSlug,
      hitCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null,
      userId: null,
      title: null,
      description: null,
      isActive: true,
      updatedAt: new Date(),
    } as Url); // In DB

    const createUrlStub = sinon.stub(UrlRepository.prototype, "createUrl");
    createUrlStub.resolves({
      id: 2,
      originalUrl,
      slug: "",
      hitCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null,
      userId: null,
      title: null,
      description: null,
      isActive: true,
      updatedAt: new Date(),
    } as Url);

    const updateSlugStub = sinon.stub(UrlRepository.prototype, "updateSlug");
    updateSlugStub.resolves({
      id: 2,
      originalUrl,
      slug: expectedSlug,
      hitCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null,
      userId: null,
      title: null,
      description: null,
      isActive: true,
      updatedAt: new Date(),
    } as Url);

    try {
      // First call: should hit DB and set cache
      const firstResult = await service.shortenUrl(originalUrl);
      expect(firstResult.slug).to.equal(expectedSlug);
      expect(cache[`long:${originalUrl}`]).to.equal(expectedSlug);
      // Second call: should hit cache, not DB
      findByOriginalUrlStub.resetHistory();
      createUrlStub.resetHistory();
      updateSlugStub.resetHistory();
      const secondResult = await service.shortenUrl(originalUrl);
      expect(secondResult.slug).to.equal(expectedSlug);
      assert.isTrue(
        findByOriginalUrlStub.notCalled,
        "DB should not be called on cache hit",
      );
      assert.isTrue(
        createUrlStub.notCalled,
        "createUrl should not be called on cache hit",
      );
      assert.isTrue(
        updateSlugStub.notCalled,
        "updateSlug should not be called on cache hit",
      );
    } finally {
      findByOriginalUrlStub.restore();
      createUrlStub.restore();
      updateSlugStub.restore();
    }
  });

  describe("User-specific functionality", () => {
    it("should create URL with user ID and metadata", async () => {
      // Arrange
      const originalUrl = "https://example.com/user-url";
      const userId = 1;
      const title = "My Custom URL";
      const description = "A description for my URL";
      const expectedSlug = base62Util.toBase62(3);

      const findByOriginalUrlStub = sinon.stub(
        UrlRepository.prototype,
        "findByOriginalUrl",
      );
      findByOriginalUrlStub.resolves(null);

      const createUrlStub = sinon.stub(UrlRepository.prototype, "createUrl");
      createUrlStub.resolves({
        id: 3,
        originalUrl,
        slug: "",
        hitCount: 0,
        createdAt: new Date(),
        lastAccessedAt: null,
        userId,
        title,
        description,
        isActive: true,
        updatedAt: new Date(),
      } as Url);

      const updateSlugStub = sinon.stub(UrlRepository.prototype, "updateSlug");
      updateSlugStub.resolves({
        id: 3,
        originalUrl,
        slug: expectedSlug,
        hitCount: 0,
        createdAt: new Date(),
        lastAccessedAt: null,
        userId,
        title,
        description,
        isActive: true,
        updatedAt: new Date(),
      } as Url);

      try {
        // Act
        const result = await service.shortenUrl(
          originalUrl,
          userId,
          title,
          description,
        );

        // Assert
        expect(result.slug).to.equal(expectedSlug);
        expect(
          createUrlStub.calledOnceWith(originalUrl, userId, title, description),
        ).to.be.true;
      } finally {
        findByOriginalUrlStub.restore();
        createUrlStub.restore();
        updateSlugStub.restore();
      }
    });

    it("should not cache user-specific URLs", async () => {
      // Arrange
      const originalUrl = "https://example.com/user-specific";
      const userId = 1;
      const cache: Record<string, string> = {};
      redis.get = async (key: string) => cache[key] || null;
      redis.set = async (key: string, value: string) => {
        cache[key] = value;
        return "OK";
      };

      const findByOriginalUrlStub = sinon.stub(
        UrlRepository.prototype,
        "findByOriginalUrl",
      );
      findByOriginalUrlStub.resolves(null);

      const createUrlStub = sinon.stub(UrlRepository.prototype, "createUrl");
      createUrlStub.resolves({
        id: 4,
        originalUrl,
        slug: "",
        hitCount: 0,
        createdAt: new Date(),
        lastAccessedAt: null,
        userId,
        title: null,
        description: null,
        isActive: true,
        updatedAt: new Date(),
      } as Url);

      const updateSlugStub = sinon.stub(UrlRepository.prototype, "updateSlug");
      updateSlugStub.resolves({
        id: 4,
        originalUrl,
        slug: "user123",
        hitCount: 0,
        createdAt: new Date(),
        lastAccessedAt: null,
        userId,
        title: null,
        description: null,
        isActive: true,
        updatedAt: new Date(),
      } as Url);

      try {
        // Act
        await service.shortenUrl(originalUrl, userId);

        // Assert
        expect(cache[`long:${originalUrl}`]).to.be.undefined;
      } finally {
        findByOriginalUrlStub.restore();
        createUrlStub.restore();
        updateSlugStub.restore();
      }
    });

    it("should get user URLs", async () => {
      // Arrange
      const userId = 1;
      const mockUrls: Url[] = [
        {
          id: 1,
          slug: "abc123",
          originalUrl: "https://example1.com",
          title: "Example 1",
          userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          hitCount: 5,
          lastAccessedAt: new Date(),
          description: null,
        },
        {
          id: 2,
          slug: "def456",
          originalUrl: "https://example2.com",
          title: "Example 2",
          userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          hitCount: 3,
          lastAccessedAt: new Date(),
          description: null,
        },
      ];

      const getUserUrlsStub = sinon.stub(
        UrlRepository.prototype,
        "getUserUrls",
      );
      getUserUrlsStub.resolves(mockUrls);

      try {
        // Act
        const result = await service.getUserUrls(userId);

        // Assert
        expect(result).to.deep.equal(mockUrls);
        expect(getUserUrlsStub.calledOnceWith(userId)).to.be.true;
      } finally {
        getUserUrlsStub.restore();
      }
    });

    it("should delete user URL successfully", async () => {
      // Arrange
      const slug = "abc123";
      const userId = 1;
      const mockUrl: Url = {
        id: 1,
        slug,
        originalUrl: "https://example.com",
        title: null,
        description: null,
        userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        hitCount: 5,
        lastAccessedAt: new Date(),
      };

      const findBySlugStub = sinon.stub(UrlRepository.prototype, "findBySlug");
      findBySlugStub.resolves(mockUrl);

      const deleteUrlStub = sinon.stub(UrlRepository.prototype, "deleteUrl");
      deleteUrlStub.resolves(mockUrl);

      try {
        // Act
        await service.deleteUrl(slug, userId);

        // Assert
        expect(findBySlugStub.calledOnceWith(slug)).to.be.true;
        expect(deleteUrlStub.calledOnceWith(mockUrl.id)).to.be.true;
      } finally {
        findBySlugStub.restore();
        deleteUrlStub.restore();
      }
    });

    it("should throw error when trying to delete URL owned by different user", async () => {
      // Arrange
      const slug = "abc123";
      const userId = 1;
      const mockUrl: Url = {
        id: 1,
        slug,
        originalUrl: "https://example.com",
        title: null,
        description: null,
        userId: 2, // Different user
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        hitCount: 5,
        lastAccessedAt: new Date(),
      };

      const findBySlugStub = sinon.stub(UrlRepository.prototype, "findBySlug");
      findBySlugStub.resolves(mockUrl);

      try {
        // Act & Assert
        await service.deleteUrl(slug, userId);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal("Access denied");
      } finally {
        findBySlugStub.restore();
      }
    });

    it("should throw error when trying to delete non-existent URL", async () => {
      // Arrange
      const slug = "nonexistent";
      const userId = 1;

      const findBySlugStub = sinon.stub(UrlRepository.prototype, "findBySlug");
      findBySlugStub.resolves(null);

      try {
        // Act & Assert
        await service.deleteUrl(slug, userId);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal("URL not found");
      } finally {
        findBySlugStub.restore();
      }
    });
  });
});
