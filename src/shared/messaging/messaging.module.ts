import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { MessageConsumerService } from './message-consumer.service.js'
import { MessageProducerService } from './message-producer.service.js'
import { NatsService } from './nats.service.js'
import { RedisService } from './redis.service.js'

/**
 * Messaging Module
 *
 * Provides NATS JetStream messaging for inter-service communication.
 * This module is global to allow any module to publish/subscribe to messages.
 *
 * Services provided:
 * - NatsService: Low-level NATS and JetStream access
 * - MessageProducerService: Publish messages to JetStream subjects
 * - MessageConsumerService: Subscribe to durable JetStream consumers
 */
@Global()
@Module({})
export class MessagingModule {
  static forRoot(): DynamicModule {
    return {
      module: MessagingModule,
      imports: [ConfigModule],
      providers: [
        RedisService,
        NatsService,
        MessageProducerService,
        MessageConsumerService,
      ],
      exports: [
        RedisService,
        NatsService,
        MessageProducerService,
        MessageConsumerService,
      ],
    }
  }
}
