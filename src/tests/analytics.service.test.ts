import "dotenv/config";
import { expect } from "chai";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import sinon from "sinon";
import { PrismaClient } from "@prisma/client";

let prismaStub: sinon.SinonStubbedInstance<PrismaClient>;
let createStub: sinon.SinonStub;
let findManyClickStub: sinon.SinonStub;
let findManyUrlStub: sinon.SinonStub;
let urlCountStub: sinon.SinonStub;
let clickCountStub: sinon.SinonStub;
let userCountStub: sinon.SinonStub;
let groupByStub: sinon.SinonStub;

describe("AnalyticsRepository", () => {
  let analyticsRepository: AnalyticsRepository;

  beforeEach(() => {
    prismaStub = sinon.createStubInstance(PrismaClient);
    // Manually assign stubs for model delegates
    prismaStub.click = {
      create: sinon.stub(),
      findMany: sinon.stub(),
      count: sinon.stub(),
      groupBy: sinon.stub(),
    } as unknown as typeof prismaStub.click;
    prismaStub.url = {
      findMany: sinon.stub(),
      count: sinon.stub(),
    } as unknown as typeof prismaStub.url;
    prismaStub.user = {
      count: sinon.stub(),
    } as unknown as typeof prismaStub.user;
    analyticsRepository = new AnalyticsRepository(prismaStub);
    createStub = prismaStub.click.create as sinon.SinonStub;
    findManyClickStub = prismaStub.click.findMany as sinon.SinonStub;
    findManyUrlStub = prismaStub.url.findMany as sinon.SinonStub;
    urlCountStub = prismaStub.url.count as sinon.SinonStub;
    clickCountStub = prismaStub.click.count as sinon.SinonStub;
    userCountStub = prismaStub.user.count as sinon.SinonStub;
    groupByStub = prismaStub.click.groupBy as sinon.SinonStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("trackClick", () => {
    it("should track a click successfully", async () => {
      // Arrange
      const urlId = 1;
      const userId = 2;
      const clickData = {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        referrer: "https://google.com",
        country: "US",
        city: "New York",
        region: "NY",
        timezone: "America/New_York",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        language: "en",
      };

      const expectedClick = {
        id: 1,
        urlId,
        userId,
        ...clickData,
        clickedAt: new Date(),
      };

      createStub.resolves(expectedClick);

      // Act
      const result = await analyticsRepository.trackClick(
        urlId,
        userId,
        clickData,
      );

      // Assert
      expect(result).to.deep.equal(expectedClick);
      createStub.calledOnceWith({
        data: {
          urlId,
          userId,
          ...clickData,
        },
      });
    });

    it("should track click without user ID", async () => {
      // Arrange
      const urlId = 1;
      const clickData = {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      const expectedClick = {
        id: 1,
        urlId,
        userId: null,
        ...clickData,
        clickedAt: new Date(),
      };

      createStub.resolves(expectedClick);

      // Act
      const result = await analyticsRepository.trackClick(
        urlId,
        null,
        clickData,
      );

      // Assert
      expect(result).to.deep.equal(expectedClick);
      createStub.calledOnceWith({
        data: {
          urlId,
          userId: null,
          ...clickData,
        },
      });
    });
  });

  describe("getUrlAnalytics", () => {
    it("should return comprehensive URL analytics", async () => {
      // Arrange
      const urlId = 1;
      const days = 30;
      const mockClicks = [
        {
          id: 1,
          urlId,
          userId: 1,
          ipAddress: "192.168.1.1",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          referrer: "https://google.com",
          country: "US",
          city: "New York",
          region: "NY",
          timezone: "America/New_York",
          deviceType: "desktop",
          browser: "Chrome",
          os: "Windows",
          language: "en",
          clickedAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          id: 2,
          urlId,
          userId: 2,
          ipAddress: "192.168.1.2",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          referrer: "https://facebook.com",
          country: "CA",
          city: "Toronto",
          region: "ON",
          timezone: "America/Toronto",
          deviceType: "mobile",
          browser: "Safari",
          os: "iOS",
          language: "en",
          clickedAt: new Date("2024-01-15T11:00:00Z"),
        },
        {
          id: 3,
          urlId,
          userId: null,
          ipAddress: "192.168.1.1", // Same IP as first click
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          referrer: "https://twitter.com",
          country: "US",
          city: "New York",
          region: "NY",
          timezone: "America/New_York",
          deviceType: "desktop",
          browser: "Chrome",
          os: "Windows",
          language: "en",
          clickedAt: new Date("2024-01-15T12:00:00Z"),
        },
      ];

      findManyClickStub.resolves(mockClicks);

      // Act
      const result = await analyticsRepository.getUrlAnalytics(urlId, days);

      // Assert
      expect(result.totalClicks).to.equal(3);
      expect(result.uniqueClicks).to.equal(2); // 2 unique IPs
      expect(result.countries).to.deep.equal({ US: 2, CA: 1 });
      expect(result.cities).to.deep.equal({ "New York": 2, Toronto: 1 });
      expect(result.deviceTypes).to.deep.equal({ desktop: 2, mobile: 1 });
      expect(result.browsers).to.deep.equal({ Chrome: 2, Safari: 1 });
      expect(result.operatingSystems).to.deep.equal({ Windows: 2, iOS: 1 });
      expect(result.referrers).to.deep.equal({
        "https://google.com": 1,
        "https://facebook.com": 1,
        "https://twitter.com": 1,
      });
      expect(result.recentClicks).to.have.length(3);

      findManyClickStub.calledOnce;
      const findManyCall = findManyClickStub.getCall(0);
      expect(findManyCall.args[0].where.urlId).to.equal(urlId);
    });

    it("should handle empty clicks array", async () => {
      // Arrange
      const urlId = 1;
      const days = 30;

      findManyClickStub.resolves([]);

      // Act
      const result = await analyticsRepository.getUrlAnalytics(urlId, days);

      // Assert
      expect(result.totalClicks).to.equal(0);
      expect(result.uniqueClicks).to.equal(0);
      expect(result.countries).to.deep.equal({});
      expect(result.cities).to.deep.equal({});
      expect(result.deviceTypes).to.deep.equal({});
      expect(result.browsers).to.deep.equal({});
      expect(result.operatingSystems).to.deep.equal({});
      expect(result.referrers).to.deep.equal({});
      expect(result.recentClicks).to.have.length(0);
    });
  });

  describe("getUserAnalytics", () => {
    it("should return user analytics with URLs and clicks", async () => {
      // Arrange
      const userId = 1;
      const days = 30;
      const mockUrls = [
        {
          id: 1,
          slug: "abc123",
          originalUrl: "https://example1.com",
          title: "Example 1",
          userId,
          isActive: true,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
          hitCount: 5,
          lastAccessedAt: new Date("2024-01-15T00:00:00Z"),
          clicks: [
            {
              id: 1,
              ipAddress: "192.168.1.1",
              clickedAt: new Date("2024-01-15T10:00:00Z"),
            },
            {
              id: 2,
              ipAddress: "192.168.1.2",
              clickedAt: new Date("2024-01-15T11:00:00Z"),
            },
          ],
        },
        {
          id: 2,
          slug: "def456",
          originalUrl: "https://example2.com",
          title: "Example 2",
          userId,
          isActive: true,
          createdAt: new Date("2024-01-02T00:00:00Z"),
          updatedAt: new Date("2024-01-02T00:00:00Z"),
          hitCount: 3,
          lastAccessedAt: new Date("2024-01-15T00:00:00Z"),
          clicks: [
            {
              id: 3,
              ipAddress: "192.168.1.3",
              clickedAt: new Date("2024-01-15T12:00:00Z"),
            },
          ],
        },
      ];

      findManyUrlStub.resolves(mockUrls);

      // Act
      const result = await analyticsRepository.getUserAnalytics(userId, days);

      // Assert
      expect(result.totalUrls).to.equal(2);
      expect(result.totalClicks).to.equal(3);
      expect(result.totalUniqueClicks).to.equal(3);
      expect(result.topUrls).to.have.length(2);
      expect(result.topUrls[0].slug).to.equal("abc123");
      expect(result.topUrls[0].clicks).to.equal(2);
      expect(result.topUrls[1].slug).to.equal("def456");
      expect(result.topUrls[1].clicks).to.equal(1);
      expect(result.urls).to.have.length(2);

      findManyUrlStub.calledOnce;
      const findManyCall = findManyUrlStub.getCall(0);
      expect(findManyCall.args[0].where.userId).to.equal(userId);
    });
  });

  describe("getGlobalAnalytics", () => {
    it("should return global analytics", async () => {
      // Arrange
      const days = 30;
      const mockTopCountries = [
        { country: "US", _count: { country: 100 } },
        { country: "CA", _count: { country: 50 } },
      ];
      const mockTopReferrers = [
        { referrer: "https://google.com", _count: { referrer: 80 } },
        { referrer: "https://facebook.com", _count: { referrer: 40 } },
      ];

      urlCountStub.resolves(100);
      clickCountStub.resolves(500);
      userCountStub.resolves(25);
      groupByStub.onFirstCall().resolves(mockTopCountries);
      groupByStub.onSecondCall().resolves(mockTopReferrers);

      // Act
      const result = await analyticsRepository.getGlobalAnalytics(days);

      // Assert
      expect(result.totalUrls).to.equal(100);
      expect(result.totalClicks).to.equal(500);
      expect(result.totalUsers).to.equal(25);
      expect(result.topCountries).to.deep.equal([
        { country: "US", count: 100 },
        { country: "CA", count: 50 },
      ]);
      expect(result.topReferrers).to.deep.equal([
        { referrer: "https://google.com", count: 80 },
        { referrer: "https://facebook.com", count: 40 },
      ]);

      urlCountStub.calledOnce;
      clickCountStub.calledOnce;
      userCountStub.calledOnce;
      groupByStub.calledTwice;
    });
  });
});
