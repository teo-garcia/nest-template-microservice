import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Redis Service
 *
 * Manages Redis connections with automatic reconnection and error handling.
 * Provides a singleton Redis client for the entire application.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Graceful shutdown
 * - Error logging and recovery
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get("config.redis");

    // Create Redis client with configuration
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      keyPrefix: redisConfig.keyPrefix,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      enableReadyCheck: redisConfig.enableReadyCheck,
      enableOfflineQueue: redisConfig.enableOfflineQueue,

      // Retry strategy with exponential backoff
      // Retries: 0ms, 100ms, 400ms, 900ms, 1600ms, 2500ms, 3600ms, ...
      retryStrategy: (times: number) => {
        const delay = Math.min(times * times * 100, 10_000);
        this.logger.warn(
          `Retrying Redis connection in ${delay}ms (attempt ${times})`,
        );
        return delay;
      },

      // Reconnect on error
      reconnectOnError: (error) => {
        this.logger.error("Redis connection error:", error.message);
        return true;
      },
    });

    // Connection event handlers
    this.client.on("connect", () => {
      this.logger.log("Redis client connecting...");
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      this.logger.log("Redis client connected and ready");
    });

    this.client.on("error", (error) => {
      this.isConnected = false;
      this.logger.error("Redis client error:", error.message);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      this.logger.warn("Redis client connection closed");
    });

    this.client.on("reconnecting", (delay: number) => {
      this.logger.log(`Redis client reconnecting in ${delay}ms...`);
    });

    this.client.on("end", () => {
      this.isConnected = false;
      this.logger.warn("Redis client connection ended");
    });
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is connected
   *
   * Relies on ioredis internal status which accurately tracks connection state.
   * The "ready" status means the client is connected and ready to receive commands.
   */
  isHealthy(): boolean {
    return this.client.status === "ready";
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === "PONG";
    } catch (error) {
      this.logger.error("Failed to ping Redis:", error);
      return false;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("Closing Redis connection...");
    await this.client.quit();
    this.logger.log("Redis connection closed");
  }
}
