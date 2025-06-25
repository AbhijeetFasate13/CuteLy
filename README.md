# 🚀 CuteLy - Production-Grade URL Shortener

A scalable, high-performance URL shortener built with modern TypeScript, Node.js, and PostgreSQL. Designed with clean architecture principles, comprehensive testing, and production-ready practices.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)

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

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Testing**: Mocha + Chai
- **Code Quality**: ESLint + Prettier + Husky

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

### Production Features

- ✅ **Clean Architecture**: Modular, testable, and maintainable codebase
- ✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes
- ✅ **Input Validation**: Zod schemas for all API endpoints
- ✅ **Code Quality**: Automated linting, formatting, and pre-commit hooks
- ✅ **Testing**: Unit tests with Mocha and Chai
- ✅ **Database Migrations**: Prisma migrations for schema versioning
- ✅ **Environment Configuration**: Secure environment variable management

### Scalability Considerations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Prisma handles database connection management
- **Modular Design**: Easy to add features like user authentication, rate limiting
- **Caching Ready**: Architecture supports Redis integration for performance

## 📚 API Documentation

### POST /api/shorten

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
- `500 Internal Server Error`: Server error

### GET /:slug

Redirects to the original URL.

**Response:**

- `302 Found`: Redirects to original URL
- `404 Not Found`: Slug doesn't exist

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
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
   # Edit .env with your database credentials
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
PORT=3000
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

### Test Architecture

- **Mocha**: Test runner with async/await support
- **Chai**: Assertion library for readable tests
- **ts-node**: TypeScript support in tests
- **Database**: Real PostgreSQL for integration testing

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run format       # Run Prettier
```

### Code Quality

- **ESLint**: Enforces code style and catches errors
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit validation
- **lint-staged**: Only lint staged files for performance

### Git Workflow

```bash
git add .
git commit -m "feat: add new feature"  # Pre-commit hooks run automatically
git push
```

## 🚀 Deployment

### Production Considerations

- **Environment Variables**: Secure configuration management
- **Database**: PostgreSQL with connection pooling
- **Process Management**: PM2 or Docker for containerization
- **Monitoring**: Health checks and logging
- **Caching**: Redis for performance optimization
- **Rate Limiting**: Protect against abuse

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Platforms

- **Railway**: Easy PostgreSQL + Node.js deployment
- **Render**: Free tier with PostgreSQL
- **Heroku**: Traditional Node.js hosting
- **AWS**: EC2 + RDS for enterprise scaling

## 📊 Performance & Scalability

### Current Optimizations

- **Database Indexing**: Optimized queries on slug and ID fields
- **Connection Pooling**: Prisma handles database connections efficiently
- **Type Safety**: Prevents runtime errors and improves performance
- **Modular Architecture**: Easy to add caching and load balancing

### Future Enhancements

- **Redis Caching**: Cache frequently accessed URLs
- **CDN Integration**: Global content delivery
- **Rate Limiting**: Protect against abuse
- **Analytics Dashboard**: User-friendly analytics interface
- **Custom Domains**: Allow users to use their own domains
- **API Authentication**: JWT-based API access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Ensure all tests pass
- Follow the existing code style
- Update documentation as needed

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 About the Developer

**Abhijeet Fasate** - Backend Engineer

This project demonstrates:

- **Clean Architecture** implementation
- **Production-ready** code practices
- **TypeScript** expertise with strict configuration
- **Database design** with Prisma ORM
- **Testing strategies** for maintainable code
- **DevOps practices** with CI/CD readiness
- **API design** with proper validation and error handling

### Technical Highlights

- **Base62 Algorithm**: Efficient URL shortening with collision prevention
- **Repository Pattern**: Clean data access layer
- **Service Layer**: Business logic separation
- **Type Safety**: Runtime validation with Zod
- **Testing**: Comprehensive test coverage
- **Code Quality**: Automated linting and formatting

---

⭐ **Star this repository if you found it helpful!**

For questions or collaboration, reach out at [your-email@example.com]
