import { randomUUID } from 'node:crypto'

import { Injectable, Logger } from '@nestjs/common'

import { NatsService } from './nats.service'

/**
 * Message Producer Service
 *
 * Publishes messages to NATS JetStream for inter-service communication.
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
  private readonly encoder = new TextEncoder()

  constructor(private readonly natsService: NatsService) {}

  private resolvePublishOptions(
    maxLengthOrOptions?: number | PublishOptions
  ): PublishOptions {
    if (typeof maxLengthOrOptions === 'number') {
      return { maxLength: maxLengthOrOptions }
    }

    return maxLengthOrOptions ?? {}
  }

  private buildEnvelope<T>(stream: string, data: T, options: PublishOptions) {
    return {
      id: options.idempotencyKey ?? randomUUID(),
      type: options.eventType ?? stream.replaceAll(':', '.'),
      source: options.source ?? 'nest-template-microservice',
      time: new Date().toISOString(),
      dataVersion: String(options.schemaVersion ?? 1),
      data,
    }
  }

  /**
   * Publish a message to NATS JetStream.
   *
   * @param stream - Logical stream name (e.g., 'orders:created', 'users:updated')
   * @param data - Message payload (will be JSON serialized)
   * @returns Message ID
   */
  async publish<T = unknown>(
    stream: string,
    data: T,
    maxLengthOrOptions?: number | PublishOptions
  ): Promise<string> {
    try {
      const options = this.resolvePublishOptions(maxLengthOrOptions)
      const subject = this.natsService.getSubject(stream)
      const streamName = this.natsService.getStreamName(stream)
      await this.natsService.ensureStream(streamName, subject)

      const envelope = this.buildEnvelope(stream, data, options)
      const jetStream = await this.natsService.getJetStream()
      const ack = await jetStream.publish(
        subject,
        this.encoder.encode(JSON.stringify(envelope)),
        { msgID: envelope.id }
      )

      const messageId = `${ack.stream}:${ack.seq}`
      this.logger.debug(`Published message to ${subject}: ${messageId}`)
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
      const messageIds: string[] = []

      for (const data of messages) {
        messageIds.push(
          await this.publish(stream, data, {
            idempotencyKey: options.idempotencyKey?.(data),
            schemaVersion: options.schemaVersion,
            eventType: options.eventType,
            source: options.source,
          })
        )
      }

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
