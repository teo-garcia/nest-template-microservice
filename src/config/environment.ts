import { registerAs } from "@nestjs/config";

/**
 * Environment Configuration
 *
 * Centralizes all environment variables for the microservice.
 * This configuration is designed to work across different cloud providers
 * and deployment environments (local, staging, production).
 */
export default registerAs("config", () => ({
  // Service Information
  // These help identify the service in logs, metrics, and distributed traces
  service: {
    name: process.env.SERVICE_NAME || "microservice",
    version: process.env.npm_package_version || "0.0.0",
  },

  // Application Settings
  app: {
    env: process.env.NODE_ENV || "development",
    port: Number.parseInt(process.env.PORT || "3000", 10),
    apiPrefix: process.env.API_PREFIX || "api",
  },

  // Database Configuration (Optional - not all microservices need a database)
  // Some microservices are stateless or share a database
  database: {
    url: process.env.DATABASE_URL,
    // Enable if service needs its own database
    enabled: process.env.DATABASE_ENABLED === "true",
  },

  // Redis Configuration
  // Used for pub/sub messaging, caching, and distributed locks
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    // Key prefix helps avoid collisions in shared Redis instances
    keyPrefix: process.env.REDIS_KEY_PREFIX || "micro:",
    // Retry strategy for connection failures
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== "false", // Enabled by default
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    // In production, we might want to send logs to a central service
    enableConsole: process.env.ENABLE_CONSOLE_LOGS !== "false",
  },

  // Service Discovery (for inter-service communication)
  // These would be used to call other microservices
  services: {
    // Example: other service URLs
    // userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    // paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
  },

  // Feature Flags
  // Toggle features without redeploying
  features: {
    enableMessaging: process.env.ENABLE_MESSAGING !== "false",
    enableCache: process.env.ENABLE_CACHE === "true",
  },
}));
