import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AppController } from './app.controller'
import { environmentConfig, validate } from './config'
import { TasksModule } from './modules/tasks'
import { HealthModule } from './shared/health'
import { LoggerModule } from './shared/logger/logger.module'
import { MessagingModule } from './shared/messaging'
import { MetricsModule } from './shared/metrics'
import { PrismaModule } from './shared/prisma'

/**
 * App Module
 *
 * Root module for the microservice.
 * Imports all shared modules and feature modules.
 *
 * Architecture:
 * - Shared modules (global): Logging, Metrics, Messaging, Database
 * - Infrastructure modules: Health checks, Configuration
 * - Feature modules: Tasks (example domain module)
 */
@Module({
  imports: [
    // Configuration
    // Loads and validates environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
      validate,
    }),

    // Logging
    // Provides structured logging throughout the application
    LoggerModule.forRoot(),

    // Database (optional - only initialize if enabled)
    // Some microservices don't need their own database
    PrismaModule,

    // Messaging (conditional - only active when ENABLE_MESSAGING=true)
    // Redis-based pub/sub for inter-service communication
    MessagingModule.forRoot(),

    // Health Checks
    // Liveness and readiness probes for orchestrators
    HealthModule,

    // Metrics
    // Prometheus-compatible metrics collection
    MetricsModule,

    // Feature Modules
    // Domain-specific business logic
    TasksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
