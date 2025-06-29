import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CuteLy URL Shortener API",
      version: "1.0.0",
      description:
        "A production-grade URL shortener with user authentication and comprehensive analytics",
      contact: {
        name: "CuteLy API Support",
        email: "support@cutely.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
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
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from login or registration",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "User ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            name: {
              type: "string",
              description: "User's display name",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },
        Url: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "URL ID",
            },
            slug: {
              type: "string",
              description: "Short URL slug",
            },
            originalUrl: {
              type: "string",
              format: "uri",
              description: "Original long URL",
            },
            title: {
              type: "string",
              description: "Custom title for the URL",
            },
            description: {
              type: "string",
              description: "Custom description for the URL",
            },
            hitCount: {
              type: "integer",
              description: "Number of times the URL was accessed",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "URL creation timestamp",
            },
            lastAccessedAt: {
              type: "string",
              format: "date-time",
              description: "Last access timestamp",
            },
          },
        },
        Analytics: {
          type: "object",
          properties: {
            totalClicks: {
              type: "integer",
              description: "Total number of clicks",
            },
            uniqueClicks: {
              type: "integer",
              description: "Number of unique visitors",
            },
            countries: {
              type: "object",
              description: "Click distribution by country",
            },
            cities: {
              type: "object",
              description: "Click distribution by city",
            },
            deviceTypes: {
              type: "object",
              description: "Click distribution by device type",
            },
            browsers: {
              type: "object",
              description: "Click distribution by browser",
            },
            operatingSystems: {
              type: "object",
              description: "Click distribution by operating system",
            },
            referrers: {
              type: "object",
              description: "Click distribution by referrer",
            },
            hourlyClicks: {
              type: "object",
              description: "Click distribution by hour",
            },
            dailyClicks: {
              type: "object",
              description: "Click distribution by day",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "URLs",
        description: "URL shortening and management operations",
      },
      {
        name: "Authentication",
        description: "User registration, login, and profile management",
      },
      {
        name: "Analytics",
        description: "URL and user analytics and click tracking",
      },
      {
        name: "Health",
        description: "Health check and system status endpoints",
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/routes/health.routes.ts",
    "./src/routes/url.routes.ts",
    "./src/routes/auth.routes.ts",
    "./src/routes/analytics.routes.ts",
  ],
};

export const specs = swaggerJsdoc(options);
