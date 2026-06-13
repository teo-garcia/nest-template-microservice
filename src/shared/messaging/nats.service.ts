import {
  AckPolicy,
  DeliverPolicy,
  DiscardPolicy,
  jetstream,
  JetStreamClient,
  JetStreamManager,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from '@nats-io/jetstream'
import { connect, NatsConnection } from '@nats-io/transport-node'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class NatsService implements OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name)
  private connection?: NatsConnection
  private connectionPromise?: Promise<NatsConnection>
  private jetStream?: JetStreamClient
  private jetStreamManager?: JetStreamManager

  constructor(private readonly configService: ConfigService) {}

  async getConnection(): Promise<NatsConnection> {
    if (this.connection) {
      return this.connection
    }

    if (!this.connectionPromise) {
      const natsConfig = this.configService.get('config.nats')
      this.connectionPromise = connect({
        name: natsConfig.clientName,
        servers: natsConfig.url,
        timeout: natsConfig.timeout,
        maxReconnectAttempts: natsConfig.maxReconnectAttempts,
        reconnectTimeWait: natsConfig.reconnectTimeWait,
      })
        .then((connection) => {
          this.connection = connection
          this.logger.log(`Connected to NATS at ${connection.getServer()}`)
          return connection
        })
        .catch((error) => {
          this.connectionPromise = undefined
          throw error
        })
    }

    return this.connectionPromise
  }

  async getJetStream(): Promise<JetStreamClient> {
    if (!this.jetStream) {
      this.jetStream = jetstream(await this.getConnection(), {
        timeout: this.getRequestTimeout(),
      })
    }

    return this.jetStream
  }

  async getJetStreamManager(): Promise<JetStreamManager> {
    if (!this.jetStreamManager) {
      this.jetStreamManager = await jetstreamManager(
        await this.getConnection(),
        {
          timeout: this.getRequestTimeout(),
        }
      )
    }

    return this.jetStreamManager
  }

  async ensureStream(streamName: string, subject: string): Promise<void> {
    const manager = await this.getJetStreamManager()
    const config = {
      name: streamName,
      subjects: [subject, `${subject}.dlq`],
      retention: RetentionPolicy.Limits,
      storage: StorageType.File,
      discard: DiscardPolicy.Old,
      max_msgs: this.configService.get<number>('config.nats.maxMessages'),
    }

    try {
      await manager.streams.info(streamName)
      await manager.streams.update(streamName, config)
    } catch {
      await manager.streams.add(config)
      this.logger.log(`Created NATS stream ${streamName} for ${subject}`)
    }
  }

  async ensureConsumer(
    streamName: string,
    consumerName: string,
    subject: string,
    maxDeliver: number
  ): Promise<void> {
    const manager = await this.getJetStreamManager()
    const config = {
      name: consumerName,
      durable_name: consumerName,
      filter_subject: subject,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      ack_wait: this.configService.get<number>('config.nats.ackWait') ?? 30e9,
      max_deliver: maxDeliver,
    }

    try {
      await manager.consumers.info(streamName, consumerName)
      await manager.consumers.update(streamName, consumerName, config)
    } catch {
      await manager.consumers.add(streamName, config)
      this.logger.log(`Created NATS consumer ${consumerName} on ${streamName}`)
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const manager = await this.getJetStreamManager()
      await manager.getAccountInfo()
      return true
    } catch (error) {
      this.logger.error('NATS health check failed:', error)
      return false
    }
  }

  getStreamName(stream: string): string {
    const prefix =
      this.configService.get<string>('config.nats.streamPrefix') ?? 'TEMPLATE'
    return `${prefix}_${this.sanitizeName(stream)}`.toUpperCase()
  }

  getSubject(stream: string): string {
    const prefix =
      this.configService.get<string>('config.nats.subjectPrefix') ?? 'templates'
    return `${prefix}.${stream.replaceAll(':', '.')}`
  }

  getDeadLetterSubject(stream: string): string {
    return `${this.getSubject(stream)}.dlq`
  }

  getConsumerName(name: string): string {
    return this.sanitizeName(name)
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connection) {
      return
    }

    this.logger.log('Draining NATS connection...')
    await this.connection.drain()
    this.connection = undefined
    this.connectionPromise = undefined
    this.jetStream = undefined
    this.jetStreamManager = undefined
    this.logger.log('NATS connection drained')
  }

  private getRequestTimeout(): number {
    return this.configService.get<number>('config.nats.timeout') ?? 5000
  }

  private sanitizeName(name: string): string {
    return name.replaceAll(/[^A-Za-z0-9_-]/g, '_')
  }
}
