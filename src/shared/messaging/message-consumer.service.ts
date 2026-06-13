import { randomUUID } from 'node:crypto'

import { JsMsg } from '@nats-io/jetstream'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { NatsService } from './nats.service'
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
  maxRetries?: number
  idempotency?: {
    ttlSeconds?: number
    keyField?: string
  }
}

/**
 * Message Consumer Service
 *
 * Consumes messages from NATS JetStream using durable pull consumers.
 * Provides automatic retry, acknowledgment, and dead letter queue handling.
 *
 * Features:
 * - Durable consumers for service-owned processing
 * - Explicit message acknowledgment
 * - Retry failed messages through JetStream redelivery
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
  private readonly encoder = new TextEncoder()
  private isShuttingDown = false

  constructor(
    private readonly natsService: NatsService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Subscribe to a NATS JetStream subject.
   *
   * @param stream - Logical stream name to consume from
   * @param consumerGroup - Durable consumer group name
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
    const streamName = this.natsService.getStreamName(stream)
    const subject = this.natsService.getSubject(stream)
    const durableName = this.natsService.getConsumerName(consumerGroup)
    const maxDeliver = options?.maxRetries ?? 3

    await this.natsService.ensureStream(streamName, subject)
    await this.natsService.ensureConsumer(
      streamName,
      durableName,
      subject,
      maxDeliver
    )

    // Mark this consumer as active
    const consumerKey = `${stream}:${consumerGroup}:${consumer}`
    this.consumers.set(consumerKey, true)

    this.logger.log(
      `Consumer ${consumer} subscribing to ${stream} in group ${consumerGroup}`
    )

    // Start consuming messages
    this.consumeMessages(
      stream,
      consumerGroup,
      durableName,
      consumer,
      handler,
      options
    )
  }

  /**
   * Main consumption loop
   */
  private async consumeMessages<T>(
    stream: string,
    consumerGroup: string,
    durableName: string,
    consumer: string,
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>
  ): Promise<void> {
    const consumerKey = `${stream}:${consumerGroup}:${consumer}`
    const streamName = this.natsService.getStreamName(stream)
    const jetStream = await this.natsService.getJetStream()
    const jetStreamConsumer = await jetStream.consumers.get(
      streamName,
      durableName
    )

    while (this.consumers.get(consumerKey) && !this.isShuttingDown) {
      try {
        const message = await jetStreamConsumer.next({ expires: 5000 })

        if (message) {
          await this.processMessage(stream, message, handler, options)
        }
      } catch (error) {
        await this.handleConsumeError(stream, error)
      }
    }

    this.logger.log(`Consumer ${consumer} stopped for stream ${stream}`)
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
   * Process a single message with error handling and retry
   */
  private async processMessage<T>(
    stream: string,
    message: JsMsg,
    handler: (message: T) => Promise<void>,
    options?: MessageConsumerOptions<T>
  ): Promise<void> {
    const maxRetries = options?.maxRetries ?? 3
    const messageId = `${message.info.stream}:${message.seq}`

    try {
      const envelope = message.json<JetStreamEnvelope<T>>()
      const payload = envelope.data
      const validate = options?.validate

      if (validate && !validate(payload)) {
        throw new Error('Invalid message payload')
      }

      const idempotencyKey = this.getIdempotencyKey(
        stream,
        messageId,
        envelope,
        options
      )

      if (idempotencyKey && (await this.isDuplicate(idempotencyKey))) {
        message.ack()
        this.logger.warn(
          `Skipped duplicate message ${messageId} from ${stream}`
        )
        return
      }

      // Process the message
      await handler(payload)

      // Acknowledge successful processing
      message.ack()
      this.logger.debug(`Acknowledged message ${messageId} from ${stream}`)

      if (idempotencyKey) {
        const ttlSeconds = options?.idempotency?.ttlSeconds ?? 86_400
        await this.markProcessed(idempotencyKey, ttlSeconds)
      }
    } catch (error) {
      this.logger.error(
        `Error processing message ${messageId} from ${stream} (attempt ${message.info.deliveryCount}):`,
        error
      )

      if (message.info.deliveryCount < maxRetries) {
        const delay = Math.pow(2, message.info.deliveryCount - 1) * 1000
        this.logger.warn(
          `Retrying message ${messageId} in ${delay}ms (attempt ${message.info.deliveryCount}/${maxRetries})`
        )
        message.nak(delay)
      } else {
        await this.moveToDeadLetterQueue(stream, messageId, message, error)
        message.term('moved to dead letter subject')
      }
    }
  }

  private getIdempotencyKey(
    stream: string,
    messageId: string,
    envelope: JetStreamEnvelope<unknown>,
    options?: MessageConsumerOptions<unknown>
  ): string | null {
    if (!options?.idempotency) {
      return null
    }

    const keyField = options.idempotency.keyField ?? 'id'
    const rawKey =
      typeof envelope[keyField as keyof JetStreamEnvelope<unknown>] === 'string'
        ? (envelope[keyField as keyof JetStreamEnvelope<unknown>] as string)
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
    message: JsMsg,
    error: unknown
  ): Promise<void> {
    try {
      const jetStream = await this.natsService.getJetStream()
      const subject = this.natsService.getDeadLetterSubject(stream)
      await jetStream.publish(
        subject,
        this.encoder.encode(
          JSON.stringify({
            data: {
              error: error instanceof Error ? error.message : String(error),
              failedAt: new Date().toISOString(),
              message: message.json<unknown>(),
              originalMessageId: messageId,
            },
            dataVersion: '1',
            id: randomUUID(),
            source: 'nest-template-microservice',
            time: new Date().toISOString(),
            type: `${this.natsService.getSubject(stream)}.dead_lettered`,
          })
        )
      )

      this.logger.error(
        `Moved message ${messageId} from ${stream} to dead letter subject`
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

type JetStreamEnvelope<T> = {
  id: string
  type: string
  source: string
  time: string
  dataVersion: string
  data: T
}
