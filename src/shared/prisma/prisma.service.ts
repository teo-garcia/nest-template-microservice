import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private readonly databaseEnabled: boolean

  constructor(private configService: ConfigService) {
    // Check if database is enabled for this microservice
    const databaseEnabled = configService.get<boolean>('config.database.enabled') ?? false
    const databaseUrl = configService.get<string>('DATABASE_URL')

    // Only initialize Prisma if database is enabled and URL is provided
    super(
      databaseEnabled && databaseUrl
        ? {
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
            log:
              configService.get<string>('NODE_ENV') === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
            errorFormat: 'colorless',
          }
        : {}
    )

    this.databaseEnabled = databaseEnabled && !!databaseUrl
  }

  async onModuleInit(): Promise<void> {
    // Only connect if database is enabled
    if (!this.databaseEnabled) {
      this.logger.log('Database disabled, skipping connection')
      return
    }

    try {
      await this.$connect()
      this.logger.log('Successfully connected to database')
    } catch (error) {
      this.logger.error('Failed to connect to database', error)
      throw error
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Only disconnect if database was enabled
    if (!this.databaseEnabled) {
      return
    }

    try {
      await this.$disconnect()
      this.logger.log('Disconnected from database')
    } catch (error) {
      this.logger.error('Error disconnecting from database', error)
    }
  }

  /**
   * Health check method to verify database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      this.logger.error('Database health check failed', error)
      return false
    }
  }

  /**
   * Get database connection info for debugging
   */
  async getDatabaseInfo(): Promise<unknown> {
    try {
      const result = await this.$queryRaw`
        SELECT
          current_database() as database_name,
          current_user as current_user,
          version() as version,
          now() as current_time
      `
      return result
    } catch (error) {
      this.logger.error('Failed to get database info', error)
      throw error
    }
  }

  /**
   * Execute raw SQL with proper error handling
   */
  async executeRaw(sql: string, parameters: unknown[] = []): Promise<number> {
    try {
      return await this.$executeRawUnsafe(sql, ...parameters)
    } catch (error) {
      this.logger.error(`Raw SQL execution failed: ${sql}`, error)
      throw error
    }
  }

  /**
   * Query raw SQL with proper error handling
   */
  async queryRaw(sql: string, parameters: unknown[] = []): Promise<unknown> {
    try {
      return await this.$queryRawUnsafe(sql, ...parameters)
    } catch (error) {
      this.logger.error(`Raw SQL query failed: ${sql}`, error)
      throw error
    }
  }
}
