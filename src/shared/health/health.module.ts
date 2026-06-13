import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

import { MessagingModule } from '../messaging'
import { PrismaModule } from '../prisma'
import { HealthController } from './health.controller'
import { NatsHealthIndicator } from './nats.health'
import { RedisHealthIndicator } from './redis.health'

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
