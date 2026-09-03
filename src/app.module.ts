import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { AppController } from './app.controller.js'
import { environmentConfig, validate } from './config/index.js'
import { TasksModule } from './modules/tasks/index.js'
import { HealthModule } from './shared/health/index.js'
import { LoggerModule } from './shared/logger/logger.module.js'
import { MessagingModule } from './shared/messaging/index.js'
import { MetricsModule } from './shared/metrics/index.js'
import { PrismaModule } from './shared/prisma/index.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
      validate,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
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
