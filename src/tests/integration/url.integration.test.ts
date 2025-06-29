import "reflect-metadata";
import { expect } from "chai";
import request from "supertest";
import express from "express";
import { configureContainer } from "../../config/container";
import urlRoutes from "../../routes/url.routes";
import prisma from "../../config/prisma";
import redis from "../../config/redis";

describe("URL Integration Tests", function () {
  this.timeout(10000);
  let app: express.Application;

  before(() => {
    // Configure DI container
    configureContainer();

    // Create test app
    app = express();
    app.use(express.json());
    app.use("/api", urlRoutes);
  });

  describe("POST /api/shorten", () => {
    it("should shorten a valid URL", async () => {
      const response = await request(app)
        .post("/api/shorten")
        .send({
          url: "https://example.com/test-url",
          title: "Test URL",
          description: "A test URL for integration testing",
        })
        .expect(200);

      expect(response.body).to.have.property("slug");
      expect(response.body).to.have.property("shortUrl");
      expect(response.body).to.have.property("originalUrl");
      expect(response.body.originalUrl).to.equal(
        "https://example.com/test-url",
      );
      expect(response.body.title).to.equal("Test URL");
      expect(response.body.description).to.equal(
        "A test URL for integration testing",
      );
    });

    it("should return 400 for invalid URL", async () => {
      const response = await request(app)
        .post("/api/shorten")
        .send({
          url: "not-a-valid-url",
        })
        .expect(400);

      expect(response.body).to.have.property("error");
      expect(response.body.error).to.include("Invalid URL format");
    });

    it("should return 400 for missing URL", async () => {
      const response = await request(app)
        .post("/api/shorten")
        .send({})
        .expect(400);

      expect(response.body).to.have.property("error");
      expect(response.body.error).to.include("URL is required");
    });

    it("should return 400 for non-HTTP/HTTPS URL", async () => {
      const response = await request(app)
        .post("/api/shorten")
        .send({
          url: "ftp://example.com/file",
        })
        .expect(400);

      expect(response.body).to.have.property("error");
      expect(response.body.error).to.include(
        "URL must have http or https protocol",
      );
    });
  });

  describe("GET /api/:slug", () => {
    it("should return 404 for non-existent slug", async () => {
      await request(app).get("/api/nonexistent-slug").expect(404);
    });
  });

  describe("DELETE /api/urls/:slug", () => {
    it("should return 401 for unauthenticated request", async () => {
      const response = await request(app)
        .delete("/api/urls/invalid-slug-format")
        .expect(401);

      expect(response.body).to.have.property("error");
      expect(response.body.error).to.include("Authentication failed");
    });
  });
});

after(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
