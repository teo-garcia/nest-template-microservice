import { Global, Module } from '@nestjs/common'

import { MessageConsumerService } from './message-consumer.service'
import { MessageProducerService } from './message-producer.service'
import { RedisService } from './redis.service'

/**
 * Messaging Module
 *
 * Provides Redis-based pub/sub messaging for inter-service communication.
 * This module is global to allow any module to publish/subscribe to messages.
 *
 * Services provided:
 * - RedisService: Low-level Redis client access
 * - MessageProducerService: Publish messages to streams
 * - MessageConsumerService: Subscribe to and consume messages from streams
 */
@Global()
@Module({
  providers: [RedisService, MessageProducerService, MessageConsumerService],
  exports: [RedisService, MessageProducerService, MessageConsumerService],
})
export class MessagingModule {}
