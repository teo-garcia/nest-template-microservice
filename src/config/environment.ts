import { registerAs } from '@nestjs/config'

/**
 * Environment Configuration
 *
 * Centralizes all environment variables for the microservice.
 * This configuration is designed to work across different cloud providers
 * and deployment environments (local, staging, production).
 */
export default registerAs('config', () => ({
  // Service Information
  // These help identify the service in logs, metrics, and distributed traces
  service: {
    name: process.env.SERVICE_NAME || 'microservice',
    version: process.env.npm_package_version || '0.0.0',
  },

  // Application Settings
  app: {
    env: process.env.NODE_ENV || 'development',
    port: Number.parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    shutdownTimeout: Number.parseInt(
      process.env.SHUTDOWN_TIMEOUT || '10000',
      10
    ),
  },

  // Database Configuration
  // Required for this microservice template
  database: {
    url: process.env.DATABASE_URL,
  },

  // NATS JetStream Configuration
  // Governed broker for inter-service events.
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clientName: process.env.NATS_CLIENT_NAME || 'nest-template-microservice',
    subjectPrefix: process.env.NATS_SUBJECT_PREFIX || 'templates',
    streamPrefix: process.env.NATS_STREAM_PREFIX || 'template',
    timeout: Number.parseInt(process.env.NATS_TIMEOUT || '5000', 10),
    ackWait:
      Number.parseInt(process.env.NATS_ACK_WAIT_SECONDS || '30', 10) *
      1_000_000_000,
    maxMessages: Number.parseInt(process.env.NATS_MAX_MESSAGES || '10000', 10),
    maxReconnectAttempts: Number.parseInt(
      process.env.NATS_MAX_RECONNECT_ATTEMPTS || '10',
      10
    ),
    reconnectTimeWait: Number.parseInt(
      process.env.NATS_RECONNECT_TIME_WAIT || '2000',
      10
    ),
  },

  // Redis Configuration
  // Available for cache, rate limiting, jobs, and idempotency state.
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    // Key prefix helps avoid collisions in shared Redis instances
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'micro:',
    // Retry strategy for connection failures
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false', // Enabled by default
  },

  // Rate Limiting
  throttle: {
    ttl: Number.parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: Number.parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    // In production, we might want to send logs to a central service
    enableConsole: process.env.ENABLE_CONSOLE_LOGS !== 'false',
  },

  // Service Discovery (for synchronous inter-service communication)
  // These would be used to call other microservices.
  services: {
    // Example: other service URLs
    // userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    // paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
  },
}))
