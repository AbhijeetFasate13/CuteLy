import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CuteLy URL Shortener API",
      version: "1.0.0",
      description:
        "A production-grade URL shortener API with caching and analytics",
      contact: {
        name: "API Support",
        email: "support@cutely.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://your-production-domain.com",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        ShortenUrlRequest: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              description: "The long URL to be shortened",
              example:
                "https://example.com/very/long/url/that/needs/shortening",
            },
          },
        },
        ShortenUrlResponse: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "The generated short URL slug",
              example: "abc123",
            },
            shortUrl: {
              type: "string",
              format: "uri",
              description: "The complete short URL",
              example: "http://localhost:3000/abc123",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "Invalid URL",
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "OK",
            },
            message: {
              type: "string",
              example: "CuteLy URL Shortener API is running",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2025-06-26T17:33:17.555Z",
            },
            version: {
              type: "string",
              example: "1.0.0",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
