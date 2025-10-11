import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus'

import { PrismaService } from '../prisma'
import { RedisHealthIndicator } from './redis.health'

/**
 * Health Check Controller
 *
 * Provides health check endpoints for deployment orchestration.
 * Supports Kubernetes liveness and readiness probes.
 *
 * Endpoints:
 * - GET /health/live: Liveness probe (is the service running?)
 * - GET /health/ready: Readiness probe (is the service ready to handle traffic?)
 * - GET /health: Comprehensive health check
 */
@Controller('health')
export class HealthController {
  private readonly databaseEnabled: boolean

  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private redis: RedisHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    // Check if database is enabled for this microservice
    this.databaseEnabled = this.configService.get<boolean>('config.database.enabled') ?? false
  }

  /**
   * Liveness Probe
   *
   * Checks if the application process is running.
   * Kubernetes uses this to determine if the container should be restarted.
   * This should be a lightweight check that only fails if the app is truly broken.
   */
  @Get('live')
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      // Basic memory check to ensure the app isn't out of memory
      // Fails if heap memory usage exceeds 300MB
      async () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ])
  }

  /**
   * Readiness Probe
   *
   * Checks if the application is ready to accept traffic.
   * Kubernetes uses this to determine if the pod should receive traffic.
   * This validates that all critical dependencies are available.
   */
  @Get('ready')
  @HealthCheck()
  checkReadiness() {
    const checks = [
      // Always check Redis as it's required for messaging
      async () => this.redis.isHealthy('redis'),
    ]

    // Only check database if it's enabled for this service
    if (this.databaseEnabled) {
      checks.push(async () => this.prismaHealth.pingCheck('database', this.prisma))
    }

    return this.health.check(checks)
  }

  /**
   * General Health Check
   *
   * Comprehensive health check including all dependencies and metrics.
   * Useful for monitoring and debugging.
   * Provides detailed status information about the service and its dependencies.
   */
  @Get()
  @HealthCheck()
  check() {
    // Build health checks dynamically based on enabled features
    if (this.databaseEnabled) {
      return this.health.check([
        // Memory check
        () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
        // Redis check
        () => this.redis.isHealthy('redis'),
        // Database check
        () => this.prismaHealth.pingCheck('database', this.prisma),
      ])
    }

    return this.health.check([
      // Memory check
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
      // Redis check
      () => this.redis.isHealthy('redis'),
    ])
  }
}
