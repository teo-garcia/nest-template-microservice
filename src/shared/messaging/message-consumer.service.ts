import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { RedisService } from './redis.service'

/**
 * Message Handler Interface
 *
 * Implement this interface to handle messages from a stream
 */
export interface MessageHandler<T = unknown> {
  handle(message: T): Promise<void>
}

export type MessageValidator<T> = (message: unknown) => message is T

export type MessageConsumerOptions<T> = {
  validate?: MessageValidator<T>
  idempotency?: {
    ttlSeconds?: number
    keyField?: string
  }
}

/**
 * Message Consumer Service
 *
 * Consumes messages from Redis Streams using consumer groups.
 * Provides automatic retry, acknowledgment, and dead letter queue handling.
 *
 * Features:
 * - Consumer groups for load balancing across instances
 * - Automatic message acknowledgment
 * - Retry failed messages with exponential backoff
 * - Dead letter queue for permanently failed messages
 * - Graceful shutdown
 *
 * Usage:
 * ```typescript
 * await this.consumer.subscribe(
 *   'orders:created',
 *   'order-service',
 *   async (message) => {
 *     await this.handleOrderCreated(message)
 *   }
 * )
 * ```
 */
@Injectable()
export class MessageConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(MessageConsumerService.name)
  private readonly consumers = new Map<string, boolean>() // Track active consumers
  private isShuttingDown = false

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Subscribe to a Redis Stream
   *
   * @param stream - Stream name to consume from
   * @param consumerGroup - Consumer group name
   * @param handler - Function to handle messages
   * @param consumerName - Optional consumer name (defaults to service name + timestamp)
   */
  async subscribe<T = unknown>(
    stream: string,
    consumerGroup: string,
    handler: (message: T) => Promise<void>,
    consumerNameOrOptions?: string | MessageConsumerOptions<T>,
    optionsArg?: MessageConsumerOptions<T>
  ): Promise<void> {
    const client = this.redisService.getClient()
    const consumerName =
      typeof consumerNameOrOptions === 'string'
        ? consumerNameOrOptions
        : undefined
    const options =
      typeof consumerNameOrOptions === 'string'
        ? optionsArg
        : consumerNameOrOptions

    const consumer =
      consumerName ||
      `${this.configService.get('config.service.name')}-${Date.now()}`

    // Create consumer group if it doesn't exist
    try {
      await client.xgroup('CREATE', stream, consumerGroup, '0', 'MKSTREAM')
      this.logger.log(
        `Created consumer group ${consumerGroup} for stream ${stream}`
      )
    } catch (error) {
      // Group already exists, which is fine
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('BUSYGROUP')) {
        this.logger.error(`Failed to create consumer group:`, error)
        throw error
      }
    }

    // Mark this consumer as active
    const consumerKey = `${stream}:${consumerGroup}:${consumer}`
    this.consumers.set(consumerKey, true)

    this.logger.log(
      `Consumer ${consumer} subscribing to ${stream} in group ${consumerGroup}`
    )

    // Start consuming messages
    this.consumeMessages(stream, consumerGroup, consumer, handler, options)
  }

  /**
   * Main consumption loop
   */
  private async consumeMessages<T>(
    stream: string,
    consumerGroup: string,
    consumer: string,
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>
  ): Promise<void> {
    const consumerKey = `${stream}:${consumerGroup}:${consumer}`

    while (this.consumers.get(consumerKey) && !this.isShuttingDown) {
      try {
        // First, process any pending messages that weren't acknowledged
        await this.processPendingMessages(
          stream,
          consumerGroup,
          consumer,
          handler,
          options
        )

        // Read and process new messages
        await this.readAndProcessNewMessages(
          stream,
          consumerGroup,
          consumer,
          handler,
          options
        )
      } catch (error) {
        await this.handleConsumeError(stream, error)
      }
    }

    this.logger.log(`Consumer ${consumer} stopped for stream ${stream}`)
  }

  /**
   * Read and process new messages from the stream
   */
  private async readAndProcessNewMessages<T>(
    stream: string,
    consumerGroup: string,
    consumer: string,
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>
  ): Promise<void> {
    const client = this.redisService.getClient()

    // Read new messages from the stream
    // XREADGROUP blocks for 5 seconds waiting for new messages
    // '>' means only read new messages not yet delivered to this consumer group
    // Using call method to bypass strict type checking for Redis command
    const results = (await client.call(
      'XREADGROUP',
      'GROUP',
      consumerGroup,
      consumer,
      'BLOCK',
      5000,
      'COUNT',
      10,
      'STREAMS',
      stream,
      '>'
    )) as Array<[string, Array<[string, string[]]>]> | null

    if (results && results.length > 0) {
      for (const [, messages] of results) {
        for (const [messageId, fields] of messages) {
          await this.processMessage(
            stream,
            consumerGroup,
            messageId,
            fields,
            handler,
            options
          )
        }
      }
    }
  }

  /**
   * Handle errors in the consumption loop
   */
  private async handleConsumeError(
    stream: string,
    error: unknown
  ): Promise<void> {
    if (!this.isShuttingDown) {
      this.logger.error(`Error in consume loop for ${stream}:`, error)
      // Wait before retrying to avoid tight loop on persistent errors
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  /**
   * Process pending messages that weren't acknowledged
   */
  private async processPendingMessages<T>(
    stream: string,
    consumerGroup: string,
    consumer: string,
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>
  ): Promise<void> {
    const client = this.redisService.getClient()

    try {
      // XPENDING shows messages delivered but not acknowledged
      const pending = (await client.xpending(
        stream,
        consumerGroup,
        '-',
        '+',
        10,
        consumer
      )) as Array<[string, string, number, number]>

      if (pending && Array.isArray(pending) && pending.length > 0) {
        this.logger.debug(`Processing ${pending.length} pending messages`)

        for (const [messageId] of pending) {
          // Claim the message to process it again
          const claimed = (await client.xclaim(
            stream,
            consumerGroup,
            consumer,
            60_000, // Claim messages idle for > 60 seconds
            messageId
          )) as Array<[string, string[]]>

          if (claimed && claimed.length > 0) {
            const [, fields] = claimed[0]
            await this.processMessage(
              stream,
              consumerGroup,
              messageId,
              fields,
              handler,
              options
            )
          }
        }
      }
    } catch (error) {
      // NOGROUP error is expected on first startup when stream/group doesn't exist yet
      // The subscribe method creates the group, but there may be no pending messages
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('NOGROUP')) {
        this.logger.debug(
          `No pending messages for ${stream}:${consumerGroup} (group may be new)`
        )
      } else {
        this.logger.error('Error processing pending messages:', error)
      }
    }
  }

  /**
   * Process a single message with error handling and retry
   */
  private async processMessage<T>(
    stream: string,
    consumerGroup: string,
    messageId: string,
    fields: string[],
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>,
    retryCount = 0
  ): Promise<void> {
    const client = this.redisService.getClient()
    const maxRetries = 3

    try {
      // Parse message data from Redis Stream format
      // Fields are in format: ['data', '{"key":"value"}', 'timestamp', '1234567890']
      const dataIndex = fields.indexOf('data')
      if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
        throw new Error('Invalid message format: missing data field')
      }

      const messageData = JSON.parse(fields[dataIndex + 1]) as unknown
      const payload = messageData as T
      const validate = options?.validate

      if (validate && !validate(payload)) {
        throw new Error('Invalid message payload')
      }

      const idempotencyKey = this.getIdempotencyKey(
        stream,
        messageId,
        fields,
        options
      )

      if (idempotencyKey && (await this.isDuplicate(idempotencyKey))) {
        await client.xack(stream, consumerGroup, messageId)
        this.logger.warn(
          `Skipped duplicate message ${messageId} from ${stream}`
        )
        return
      }

      // Process the message
      await handler(payload)

      // Acknowledge successful processing
      await client.xack(stream, consumerGroup, messageId)
      this.logger.debug(`Acknowledged message ${messageId} from ${stream}`)

      if (idempotencyKey) {
        const ttlSeconds = options?.idempotency?.ttlSeconds ?? 86_400
        await this.markProcessed(idempotencyKey, ttlSeconds)
      }
    } catch (error) {
      this.logger.error(
        `Error processing message ${messageId} from ${stream} (attempt ${retryCount + 1}):`,
        error
      )

      if (retryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        this.logger.warn(
          `Retrying message ${messageId} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        await this.processMessage(
          stream,
          consumerGroup,
          messageId,
          fields,
          handler,
          options,
          retryCount + 1
        )
      } else {
        // Move to dead letter queue after max retries
        await this.moveToDeadLetterQueue(stream, messageId, fields, error)
        // Still acknowledge to remove from pending
        await client.xack(stream, consumerGroup, messageId)
      }
    }
  }

  private getIdempotencyKey(
    stream: string,
    messageId: string,
    fields: string[],
    options?: MessageConsumerOptions<unknown>
  ): string | null {
    if (!options?.idempotency) {
      return null
    }

    const keyField = options.idempotency.keyField ?? 'idempotencyKey'
    const keyIndex = fields.indexOf(keyField)
    const rawKey =
      keyIndex !== -1 && keyIndex + 1 < fields.length
        ? fields[keyIndex + 1]
        : undefined
    const suffix = rawKey && rawKey.length > 0 ? rawKey : messageId

    return `idempotency:${stream}:${suffix}`
  }

  private async isDuplicate(idempotencyKey: string): Promise<boolean> {
    const client = this.redisService.getClient()
    const existing = await client.get(idempotencyKey)
    return existing != null
  }

  private async markProcessed(
    idempotencyKey: string,
    ttlSeconds: number
  ): Promise<void> {
    const client = this.redisService.getClient()
    await client.set(idempotencyKey, '1', 'EX', ttlSeconds)
  }

  /**
   * Move failed message to dead letter queue
   */
  private async moveToDeadLetterQueue(
    stream: string,
    messageId: string,
    fields: string[],
    error: unknown
  ): Promise<void> {
    try {
      const client = this.redisService.getClient()
      const dlqStream = `${stream}:dlq`

      // Store the failed message with error information
      await client.xadd(
        dlqStream,
        '*',
        ...fields,
        'originalMessageId',
        messageId,
        'error',
        error instanceof Error ? error.message : String(error),
        'failedAt',
        Date.now().toString()
      )

      this.logger.error(
        `Moved message ${messageId} from ${stream} to dead letter queue`
      )
    } catch (dlqError) {
      this.logger.error('Failed to move message to DLQ:', dlqError)
    }
  }

  /**
   * Unsubscribe from a stream
   */
  async unsubscribe(
    stream: string,
    consumerGroup: string,
    consumerName: string
  ): Promise<void> {
    const consumerKey = `${stream}:${consumerGroup}:${consumerName}`
    this.consumers.delete(consumerKey)
    this.logger.log(`Unsubscribed ${consumerName} from ${stream}`)
  }

  /**
   * Gracefully shutdown all consumers
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down message consumers...')
    this.isShuttingDown = true
    this.consumers.clear()
    // Give time for current messages to finish processing
    await new Promise((resolve) => setTimeout(resolve, 5000))
    this.logger.log('Message consumers shut down')
  }
}
