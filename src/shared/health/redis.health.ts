import { Injectable } from "@nestjs/common";
// eslint-disable-next-line sonarjs/deprecation -- Using deprecated APIs until @nestjs/terminus provides alternatives
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";

import { RedisService } from "../messaging/redis.service";

/**
 * Redis Health Indicator
 *
 * Checks the health of the Redis connection.
 * Used in readiness probes to ensure the service doesn't receive traffic
 * when it can't communicate with Redis.
 *
 * Note: Uses deprecated @nestjs/terminus APIs. Will be updated when new APIs are available.
 */
@Injectable()
// eslint-disable-next-line sonarjs/deprecation -- HealthIndicator is deprecated but still the recommended approach
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  /**
   * Check Redis connectivity
   *
   * @param key - Health check key name
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if Redis client is in a healthy state
      const isHealthy = this.redisService.isHealthy();

      if (!isHealthy) {
        throw new Error("Redis client is not in ready state");
      }

      // Ping Redis to verify connectivity
      const canPing = await this.redisService.ping();

      if (!canPing) {
        throw new Error("Failed to ping Redis");
      }

      // Return healthy status
      return this.getStatus(key, true, {
        status: "up",
        message: "Redis is healthy",
      });
    } catch (error) {
      // Return unhealthy status
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // eslint-disable-next-line sonarjs/deprecation -- HealthCheckError is deprecated but still the recommended approach
      throw new HealthCheckError(
        "Redis health check failed",
        this.getStatus(key, false, {
          status: "down",
          message: errorMessage,
        }),
      );
    }
  }
}
