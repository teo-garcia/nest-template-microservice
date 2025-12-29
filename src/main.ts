import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './shared/filters'
import { RequestIdInterceptor, TransformInterceptor } from './shared/interceptors'
import { AppLogger } from './shared/logger/logger.service'
import { MetricsInterceptor } from './shared/metrics'
import { GlobalValidationPipe } from './shared/pipes'

/**
 * Bootstrap the microservice application
 *
 * Setup process:
 * 1. Create NestJS application
 * 2. Configure logger
 * 3. Register global middleware (validation, error handling, interceptors)
 * 4. Enable graceful shutdown
 * 5. Start listening on configured port
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  // Get configuration
  const configService = app.get(ConfigService)
  const port = configService.get<number>('config.app.port') ?? 3000
  const apiPrefix = configService.get<string>('config.app.apiPrefix') ?? 'api'
  const serviceName = configService.get<string>('config.service.name')
  const serviceVersion = configService.get<string>('config.service.version')

  // Setup logger
  const logger = app.get(AppLogger)
  logger.setContext('Bootstrap')
  app.useLogger(logger)

  // Set global API prefix
  // All routes will be prefixed with this (e.g., /api/orders)
  // Health and metrics endpoints are excluded
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix, {
      exclude: ['health', 'health/live', 'health/ready', 'metrics'],
    })
  }

  // Enable CORS for microservice architecture
  // In production, configure specific origins
  const corsOrigin = configService.get<string>('config.cors.origin') ?? '*'
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })

  // Register global pipes, filters, and interceptors
  // Order matters for interceptors
  app.useGlobalPipes(new GlobalValidationPipe())
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(
    new RequestIdInterceptor(), // First: Add request ID for tracing
    new TransformInterceptor(configService), // Second: Transform responses
    app.get(MetricsInterceptor) // Third: Record metrics
  )

  // Enable graceful shutdown hooks
  // Ensures clean shutdown of database connections and message consumers
  // All services with OnModuleDestroy will be cleaned up automatically
  app.enableShutdownHooks()

  // Start the application
  await app.listen(port)

  const baseUrl = `http://localhost:${port}`
  const fullUrl = apiPrefix ? `${baseUrl}/${apiPrefix}` : baseUrl
  logger.log(`${serviceName} v${serviceVersion} is running on: ${fullUrl}`)
  logger.log(`Metrics available at: ${baseUrl}/metrics`)
  logger.log(`Health check available at: ${baseUrl}/health`)
}

// Handle graceful shutdown signals
// These signals are sent by orchestrators (Docker, Kubernetes) when stopping containers
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
})

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Start the application
// eslint-disable-next-line unicorn/prefer-top-level-await
bootstrap().catch((error) => {
  console.error('Failed to start application:', error)
  throw error
})
