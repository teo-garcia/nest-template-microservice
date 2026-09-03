import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { WinstonModule } from 'nest-winston'
import { Logger } from 'winston'

import { createLoggerConfig } from './logger.config.js'
import { AppLogger } from './logger.service.js'

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        WinstonModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            return createLoggerConfig(
              configService.get('config.app.env') || 'development'
            )
          },
        }),
      ],
      providers: [
        {
          provide: AppLogger,
          useFactory: (logger: Logger): AppLogger => {
            return new AppLogger(logger)
          },
          inject: ['winston'],
        },
      ],
      exports: [AppLogger],
    }
  }
}
