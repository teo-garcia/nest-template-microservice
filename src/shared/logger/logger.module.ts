import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import { Logger } from "winston";

import { createLoggerConfig } from "./logger.config";
import { AppLogger } from "./logger.service";

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        WinstonModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            return createLoggerConfig(
              configService.get("config.app.env") || "development",
            );
          },
        }),
      ],
      providers: [
        {
          provide: AppLogger,
          useFactory: (logger: Logger): AppLogger => {
            return new AppLogger(logger);
          },
          inject: ["winston"],
        },
      ],
      exports: [AppLogger],
    };
  }
}
