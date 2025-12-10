import { Injectable } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";

import { RedisService } from "../messaging/redis.service";

/**
 * Redis Health Indicator
 *
 * Checks the health of the Redis connection.
 * Used in readiness probes to ensure the service doesn't receive traffic
 * when it can't communicate with Redis.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Create a health status object
   *
   * @param key - Health check key name
   * @param isHealthy - Whether the service is healthy
   * @param data - Additional status data
   * @returns Health indicator result
   */
  private getStatus(
    key: string,
    isHealthy: boolean,
    data?: Record<string, unknown>,
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? "up" : "down",
        ...data,
      },
    };
  }

  /**
   * Check Redis connectivity
   *
   * @param key - Health check key name
   * @returns Health indicator result
   * @throws Error if Redis is unhealthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
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
      message: "Redis is healthy",
    });
  }
}
