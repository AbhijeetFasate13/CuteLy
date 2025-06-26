# 🚀 CuteLy - Production-Grade URL Shortener

A scalable, high-performance URL shortener built with modern TypeScript, Node.js, and PostgreSQL. Designed with clean architecture principles, comprehensive testing, and production-ready practices.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## 🏗️ Architecture Overview

This project demonstrates **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │───▶│    Services     │───▶│  Repositories   │
│   (HTTP Layer)  │    │ (Business Logic)│    │  (Data Access)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Validation    │    │   Utilities     │    │   Database      │
│   (Zod DTOs)    │    │  (Base62, etc.) │    │  (Prisma/PostgreSQL) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Architectural Decisions

- **Base62 Encoding**: Uses auto-incrementing IDs with base62 encoding for collision-free, predictable short URLs
- **Repository Pattern**: Abstracts database operations for testability and maintainability
- **Service Layer**: Contains business logic, ensuring controllers remain thin
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Validation**: Zod schemas for runtime type safety and API validation
- **Caching Strategy**: Redis for both read and write path optimization
- **Structured Logging**: Winston-based logging with different levels and formats

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis with ioredis
- **Validation**: Zod
- **Testing**: Mocha + Chai
- **Code Quality**: ESLint + Prettier + Husky
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet.js, CORS

### Development Tools

- **Hot Reload**: ts-node-dev
- **Git Hooks**: Husky + lint-staged
- **Package Manager**: npm
- **Environment**: dotenv

## ✨ Features

### Core Functionality

- ✅ **URL Shortening**: Convert long URLs to short, memorable slugs
- ✅ **URL Redirection**: Fast redirects with analytics tracking
- ✅ **Collision-Free Slugs**: Base62 encoding ensures unique, predictable URLs
- ✅ **Analytics**: Track hit counts and last access times
- ✅ **Type Safety**: Full TypeScript coverage with runtime validation
- ✅ **Idempotent Operations**: Same long URL always returns same short URL

### Production Features

- ✅ **Clean Architecture**: Modular, testable, and maintainable codebase
- ✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes
- ✅ **Input Validation**: Zod schemas for all API endpoints
- ✅ **Code Quality**: Automated linting, formatting, and pre-commit hooks
- ✅ **Testing**: Unit tests with Mocha and Chai
- ✅ **Database Migrations**: Prisma migrations for schema versioning
- ✅ **Environment Configuration**: Secure environment variable management
- ✅ **Structured Logging**: Winston-based logging with file and console output
- ✅ **API Documentation**: Interactive Swagger documentation
- ✅ **Health Monitoring**: Comprehensive health checks for all services
- ✅ **Security Headers**: Helmet.js for security best practices
- ✅ **Rate Limiting**: IP-based rate limiting with Redis
- ✅ **Caching**: Redis caching for both read and write operations
- ✅ **Graceful Shutdown**: Proper signal handling for container orchestration

### Scalability Considerations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Prisma handles database connection management
- **Modular Design**: Easy to add features like user authentication, rate limiting
- **Caching Strategy**: Redis integration for performance optimization
- **Horizontal Scaling**: Stateless design allows easy scaling
- **Monitoring**: Comprehensive logging and health checks

## 📚 API Documentation

### Interactive Documentation

Visit `/api-docs` for interactive Swagger documentation with:

- Complete API reference
- Request/response examples
- Try-it-out functionality
- Schema definitions

### Core Endpoints

#### POST /api/shorten

Creates a short URL from a long URL.

**Request:**

```json
{
  "url": "https://example.com/very/long/url/that/needs/shortening"
}
```

**Response:**

```json
{
  "slug": "abc123",
  "shortUrl": "http://localhost:3000/abc123"
}
```

**Status Codes:**

- `201 Created`: URL successfully shortened
- `400 Bad Request`: Invalid URL format
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

#### GET /:slug

Redirects to the original URL.

**Response:**

- `302 Found`: Redirects to original URL
- `404 Not Found`: Slug doesn't exist

#### GET /health

Comprehensive health check for all services.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-06-26T17:33:17.555Z",
  "uptime": 3600,
  "responseTime": "15ms",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "version": "1.0.0",
  "environment": "production"
}
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 6+
- npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AbhijeetFasate13/CuteLy.git
   cd CuteLy
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis credentials
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/urlshortener?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
# Run all tests
npm test

# Run tests with Prisma setup
npm run test:with-db
```

### Test Coverage

- **Unit Tests**: Service layer business logic
- **Integration Tests**: API endpoints (ready to add)
- **Database Tests**: Repository layer operations
- **Caching Tests**: Redis integration verification

### Test Architecture

- **Mocha**: Test runner with async/await support
- **Chai**: Assertion library for readable tests
- **ts-node**: TypeScript support in tests
- **Database**: Real PostgreSQL for integration testing

## 📊 Monitoring & Observability

### Logging

- **Structured Logging**: Winston-based logging with JSON format
- **Log Levels**: Error, Warn, Info, HTTP, Debug
- **File Output**: Separate error and combined log files
- **Development**: Colored console output with timestamps

### Health Checks

- **Service Health**: Database and Redis connectivity
- **Response Times**: Performance monitoring
- **Uptime Tracking**: Server uptime monitoring
- **Environment Info**: Version and environment details

### API Monitoring

- **Request Logging**: All HTTP requests with timing
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Metrics**: Response time tracking
- **Rate Limiting**: IP-based rate limit monitoring

## 🔒 Security Features

- **Security Headers**: Helmet.js for security best practices
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schemas for all inputs
- **Rate Limiting**: IP-based rate limiting to prevent abuse
- **Request Size Limits**: Protection against large payloads
- **Error Sanitization**: Safe error messages in production

## 🚀 Deployment

### Railway Deployment

1. **Connect your repository to Railway**
2. **Add PostgreSQL and Redis plugins**
3. **Set environment variables**
4. **Deploy automatically on push**

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
NODE_ENV=production
PORT=3000
```

## 📈 Performance Optimizations

- **Redis Caching**: Both read and write path optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Idempotent Operations**: Prevents duplicate URL creation
- **Rate Limiting**: Prevents abuse and ensures fair usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ using modern TypeScript and clean architecture principles.**

For questions or collaboration, reach out at [your-email@example.com]
