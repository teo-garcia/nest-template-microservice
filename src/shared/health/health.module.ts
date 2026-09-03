import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

import { MessagingModule } from '../messaging/index.js'
import { PrismaModule } from '../prisma/index.js'
import { HealthController } from './health.controller.js'
import { NatsHealthIndicator } from './nats.health.js'
import { RedisHealthIndicator } from './redis.health.js'

/**
 * Health Module
 *
 * Provides comprehensive health check endpoints for the microservice.
 * Integrates with @nestjs/terminus for standardized health checks.
 */
@Module({
  imports: [TerminusModule, PrismaModule, MessagingModule.forRoot()],
  controllers: [HealthController],
  providers: [NatsHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
