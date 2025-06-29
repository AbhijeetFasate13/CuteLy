import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { UrlService } from "../services/url.service";
import { AuthService } from "../services/auth.service";
import { UrlRepository } from "../repositories/url.repository";
import { UserRepository } from "../repositories/user.repository";
import { AnalyticsRepository } from "../repositories/analytics.repository";

/**
 * Configure dependency injection container
 * Registers all services and repositories with their dependencies
 */
export function configureContainer(): void {
  // Register Prisma client as singleton
  container.registerInstance("PrismaClient", new PrismaClient());

  // Register repositories
  container.register("UrlRepository", {
    useClass: UrlRepository,
  });

  container.register("UserRepository", {
    useClass: UserRepository,
  });

  container.register("AnalyticsRepository", {
    useClass: AnalyticsRepository,
  });

  // Register services
  container.register("UrlService", {
    useClass: UrlService,
  });

  container.register("AuthService", {
    useClass: AuthService,
  });
}

/**
 * Get a service instance from the container
 * @param token - The service token
 * @returns Service instance
 */
export function getService<T>(token: string): T {
  return container.resolve<T>(token);
}

export default container;
