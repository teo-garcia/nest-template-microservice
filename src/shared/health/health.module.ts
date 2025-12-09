import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { MessagingModule } from "../messaging";
import { PrismaModule } from "../prisma";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./redis.health";

/**
 * Health Module
 *
 * Provides comprehensive health check endpoints for the microservice.
 * Integrates with @nestjs/terminus for standardized health checks.
 */
@Module({
  imports: [
    TerminusModule,
    PrismaModule,
    MessagingModule, // For Redis health checks
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
