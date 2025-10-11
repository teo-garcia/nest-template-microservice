import { Injectable, Logger } from '@nestjs/common'

import { RedisService } from './redis.service'

/**
 * Message Producer Service
 *
 * Publishes messages to Redis Streams for inter-service communication.
 * Redis Streams provide:
 * - Guaranteed message ordering
 * - Persistent message history
 * - Consumer groups for load balancing
 * - At-least-once delivery semantics
 *
 * Usage:
 * ```typescript
 * await this.producer.publish('orders:created', {
 *   orderId: '123',
 *   userId: 'user-456',
 *   amount: 99.99
 * })
 * ```
 */
@Injectable()
export class MessageProducerService {
  private readonly logger = new Logger(MessageProducerService.name)

  constructor(private readonly redisService: RedisService) {}

  /**
   * Publish a message to a Redis Stream
   *
   * @param stream - Stream name (e.g., 'orders:created', 'users:updated')
   * @param data - Message payload (will be JSON serialized)
   * @param maxLength - Maximum stream length (for memory management, defaults to 10000)
   * @returns Message ID
   */
  async publish<T = unknown>(
    stream: string,
    data: T,
    maxLength = 10_000,
  ): Promise<string> {
    try {
      const client = this.redisService.getClient()

      // Prepare message data
      // Redis Streams store data as field-value pairs
      // We use a single 'data' field with JSON serialized payload
      const messageData = {
        data: JSON.stringify(data),
        timestamp: Date.now().toString(),
      }

      // XADD command adds a message to the stream
      // MAXLEN ~ keeps stream size manageable (approximate trimming for performance)
      // * auto-generates message ID based on timestamp
      const messageId = await client.xadd(
        stream,
        'MAXLEN',
        '~',
        maxLength,
        '*',
        'data',
        messageData.data,
        'timestamp',
        messageData.timestamp,
      )

      this.logger.debug(`Published message to ${stream}: ${messageId}`)
      return messageId
    } catch (error) {
      this.logger.error(`Failed to publish message to ${stream}:`, error)
      throw error
    }
  }

  /**
   * Publish multiple messages in a pipeline for better performance
   *
   * @param stream - Stream name
   * @param messages - Array of message payloads
   * @returns Array of message IDs
   */
  async publishBatch<T = unknown>(
    stream: string,
    messages: T[],
  ): Promise<string[]> {
    try {
      const client = this.redisService.getClient()
      const pipeline = client.pipeline()

      // Add all messages to the pipeline
      for (const data of messages) {
        const messageData = {
          data: JSON.stringify(data),
          timestamp: Date.now().toString(),
        }

        pipeline.xadd(
          stream,
          'MAXLEN',
          '~',
          10_000,
          '*',
          'data',
          messageData.data,
          'timestamp',
          messageData.timestamp,
        )
      }

      // Execute all commands at once
      const results = await pipeline.exec()

      if (!results) {
        throw new Error('Pipeline execution failed')
      }

      // Extract message IDs from results
      const messageIds = results.map((result) => {
        if (result[0]) {
          throw result[0] // Throw error if any command failed
        }
        return result[1] as string
      })

      this.logger.debug(
        `Published ${messages.length} messages to ${stream} in batch`,
      )
      return messageIds
    } catch (error) {
      this.logger.error(`Failed to publish batch to ${stream}:`, error)
      throw error
    }
  }
}

