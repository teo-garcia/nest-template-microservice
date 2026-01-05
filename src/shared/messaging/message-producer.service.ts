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

  private resolvePublishOptions(
    maxLengthOrOptions?: number | PublishOptions
  ): PublishOptions {
    if (typeof maxLengthOrOptions === 'number') {
      return { maxLength: maxLengthOrOptions }
    }

    return maxLengthOrOptions ?? {}
  }

  private buildMessageFields<T>(data: T, options: PublishOptions): string[] {
    const fields: string[] = [
      'data',
      JSON.stringify(data),
      'timestamp',
      Date.now().toString(),
    ]

    if (options.idempotencyKey) {
      fields.push('idempotencyKey', options.idempotencyKey)
    }

    if (options.schemaVersion != undefined) {
      fields.push('schemaVersion', String(options.schemaVersion))
    }

    if (options.eventType) {
      fields.push('eventType', options.eventType)
    }

    if (options.source) {
      fields.push('source', options.source)
    }

    return fields
  }

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
    maxLengthOrOptions?: number | PublishOptions
  ): Promise<string> {
    try {
      const client = this.redisService.getClient()
      const options = this.resolvePublishOptions(maxLengthOrOptions)
      const maxLength = options.maxLength ?? 10_000
      const fields = this.buildMessageFields(data, options)

      // XADD command adds a message to the stream
      // MAXLEN ~ keeps stream size manageable (approximate trimming for performance)
      // * auto-generates message ID based on timestamp
      const messageId = await client.xadd(
        stream,
        'MAXLEN',
        '~',
        maxLength,
        '*',
        ...fields
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
    options: PublishBatchOptions<T> = {}
  ): Promise<string[]> {
    try {
      const client = this.redisService.getClient()
      const pipeline = client.pipeline()
      const maxLength = options.maxLength ?? 10_000

      // Add all messages to the pipeline
      for (const data of messages) {
        const messageFields = this.buildMessageFields(data, {
          idempotencyKey: options.idempotencyKey?.(data),
          schemaVersion: options.schemaVersion,
          eventType: options.eventType,
          source: options.source,
        })

        pipeline.xadd(stream, 'MAXLEN', '~', maxLength, '*', ...messageFields)
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
        `Published ${messages.length} messages to ${stream} in batch`
      )
      return messageIds
    } catch (error) {
      this.logger.error(`Failed to publish batch to ${stream}:`, error)
      throw error
    }
  }
}

type PublishOptions = {
  maxLength?: number
  idempotencyKey?: string
  schemaVersion?: number
  eventType?: string
  source?: string
}

type PublishBatchOptions<T> = {
  maxLength?: number
  idempotencyKey?: (data: T) => string
  schemaVersion?: number
  eventType?: string
  source?: string
}
