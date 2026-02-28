import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { AppController } from './app.controller'
import { environmentConfig, validate } from './config'
import { TasksModule } from './modules/tasks'
import { HealthModule } from './shared/health'
import { LoggerModule } from './shared/logger/logger.module'
import { MessagingModule } from './shared/messaging'
import { MetricsModule } from './shared/metrics'
import { PrismaModule } from './shared/prisma'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
      validate,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('config.throttle.ttl') ?? 60) * 1000,
            limit: config.get<number>('config.throttle.limit') ?? 100,
          },
        ],
      }),
    }),

    LoggerModule.forRoot(),
    PrismaModule,
    MessagingModule.forRoot(),
    HealthModule,
    MetricsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
