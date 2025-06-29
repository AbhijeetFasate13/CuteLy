/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { expect } from "chai";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import prisma from "../config/prisma";

// Helper to spy on repository
const sinon = require("sinon");

let createStub: any;
let findManyClickStub: any;
let findManyUrlStub: any;
let urlCountStub: any;
let clickCountStub: any;
let userCountStub: any;

describe("AnalyticsRepository", function () {
  this.timeout(10000);
  let analyticsRepository: AnalyticsRepository;

  beforeEach(() => {
    // Create a simple mock object instead of using sinon.createStubInstance
    const mockPrisma = {
      click: {
        create: sinon.stub(),
        findMany: sinon.stub(),
        count: sinon.stub(),
        groupBy: sinon.stub(),
      },
      url: {
        findMany: sinon.stub(),
        count: sinon.stub(),
      },
      user: {
        count: sinon.stub(),
      },
    };

    analyticsRepository = new AnalyticsRepository(mockPrisma as any);
    createStub = mockPrisma.click.create;
    findManyClickStub = mockPrisma.click.findMany;
    findManyUrlStub = mockPrisma.url.findMany;
    urlCountStub = mockPrisma.url.count;
    clickCountStub = mockPrisma.click.count;
    userCountStub = mockPrisma.user.count;
    mockPrisma.click.groupBy.resolves([]);
    mockPrisma.url.count.resolves(0);
    mockPrisma.click.count.resolves(0);
    mockPrisma.user.count.resolves(0);
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
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        referrer: undefined,
        country: undefined,
        city: undefined,
        region: undefined,
        timezone: undefined,
        deviceType: undefined,
        browser: undefined,
        os: undefined,
        language: undefined,
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
      expect(
        createStub.calledOnceWith({ data: { urlId, userId, ...clickData } }),
      ).to.be.true;
    });

    it("should track click without user ID", async () => {
      // Arrange
      const urlId = 1;
      const clickData = {
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        referrer: undefined,
        country: undefined,
        city: undefined,
        region: undefined,
        timezone: undefined,
        deviceType: undefined,
        browser: undefined,
        os: undefined,
        language: undefined,
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
      expect(
        createStub.calledOnceWith({
          data: { urlId, userId: null, ...clickData },
        }),
      ).to.be.true;
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

      expect(findManyClickStub.calledOnce).to.be.true;
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
    it("should return user analytics", async () => {
      // Arrange
      const userId = 1;
      const days = 30;
      const mockUrls = [
        {
          id: 1,
          userId,
          originalUrl: "https://example.com",
          slug: "abc123",
          hitCount: 5,
          createdAt: new Date(),
          clicks: [
            {
              id: 1,
              urlId: 1,
              userId: 1,
              ipAddress: "192.168.1.1",
              clickedAt: new Date(),
            },
          ],
        },
      ];

      findManyUrlStub.resolves(mockUrls);

      // Act
      const result = await analyticsRepository.getUserAnalytics(userId, days);

      // Assert
      expect(result.totalUrls).to.equal(1);
      expect(result.totalClicks).to.equal(1);
      expect(result.urls).to.have.length(1);

      expect(findManyUrlStub.calledOnce).to.be.true;
    });
  });

  describe("getGlobalAnalytics", () => {
    it("should return global analytics", async () => {
      // Arrange
      const days = 30;
      urlCountStub.resolves(100);
      clickCountStub.resolves(500);
      userCountStub.resolves(50);

      // Act
      const result = await analyticsRepository.getGlobalAnalytics(days);

      // Assert
      expect(result.totalUrls).to.equal(100);
      expect(result.totalClicks).to.equal(500);
      expect(result.totalUsers).to.equal(50);

      expect(urlCountStub.calledOnce).to.be.true;
      expect(clickCountStub.calledOnce).to.be.true;
      expect(userCountStub.calledOnce).to.be.true;
    });
  });
});

after(async () => {
  await prisma.$disconnect();
});
