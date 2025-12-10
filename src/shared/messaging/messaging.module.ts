import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { MessageConsumerService } from "./message-consumer.service";
import { MessageProducerService } from "./message-producer.service";
import { RedisService } from "./redis.service";

/**
 * Messaging Module
 *
 * Provides Redis-based pub/sub messaging for inter-service communication.
 * This module is global to allow any module to publish/subscribe to messages.
 *
 * The module only registers its providers when ENABLE_MESSAGING=true.
 * When disabled, a no-op MessageProducerService is provided to prevent errors.
 *
 * Services provided (when enabled):
 * - RedisService: Low-level Redis client access
 * - MessageProducerService: Publish messages to streams
 * - MessageConsumerService: Subscribe to and consume messages from streams
 */
@Global()
@Module({})
export class MessagingModule {
  static forRoot(): DynamicModule {
    return {
      module: MessagingModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: "MESSAGING_ENABLED",
          useFactory: (configService: ConfigService) =>
            configService.get<boolean>("config.features.enableMessaging") ??
            false,
          inject: [ConfigService],
        },
        {
          provide: RedisService,
          useFactory: (configService: ConfigService) => {
            const enabled =
              configService.get<boolean>("config.features.enableMessaging") ??
              false;
            if (!enabled) {
              // Return a no-op service when messaging is disabled
              return {
                getClient: () => null,
                isHealthy: () => false,
                ping: async () => false,
                onModuleDestroy: async () => {},
              };
            }
            return new RedisService(configService);
          },
          inject: [ConfigService],
        },
        {
          provide: MessageProducerService,
          useFactory: (
            redisService: RedisService,
            configService: ConfigService,
          ) => {
            const enabled =
              configService.get<boolean>("config.features.enableMessaging") ??
              false;
            if (!enabled) {
              // Return a no-op producer when messaging is disabled
              return {
                publish: async () => {
                  // Silent no-op when messaging is disabled
                },
              };
            }
            return new MessageProducerService(redisService);
          },
          inject: [RedisService, ConfigService],
        },
        {
          provide: MessageConsumerService,
          useFactory: (
            redisService: RedisService,
            configService: ConfigService,
          ) => {
            const enabled =
              configService.get<boolean>("config.features.enableMessaging") ??
              false;
            if (!enabled) {
              // Return a no-op consumer when messaging is disabled
              return {
                subscribe: async () => {},
                unsubscribe: async () => {},
                onModuleDestroy: async () => {},
              };
            }
            return new MessageConsumerService(redisService, configService);
          },
          inject: [RedisService, ConfigService],
        },
      ],
      exports: [RedisService, MessageProducerService, MessageConsumerService],
    };
  }
}
