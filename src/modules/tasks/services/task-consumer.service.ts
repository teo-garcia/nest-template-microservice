import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MessageConsumerService } from '../../../shared/messaging'
import { isTaskEvent, TaskEvent } from '../dto'

/**
 * Task Consumer Service
 *
 * Demonstrates how to consume events from Redis Streams.
 * This service subscribes to task events and processes them.
 *
 * In a real microservices architecture, this would be in a different service
 * that needs to react to task changes (e.g., notification service, analytics service).
 *
 * For this template, it serves as an example of:
 * - Setting up Redis Stream consumers
 * - Processing events with consumer groups
 * - Handling event payloads
 */
@Injectable()
export class TaskConsumerService implements OnModuleInit {
  private readonly logger = new Logger(TaskConsumerService.name)
  private readonly messagingEnabled: boolean
  private readonly serviceName: string

  constructor(
    private readonly messageConsumer: MessageConsumerService,
    private readonly configService: ConfigService
  ) {
    this.messagingEnabled =
      this.configService.get<boolean>('config.features.enableMessaging') ??
      false
    this.serviceName =
      this.configService.get<string>('config.service.name') ?? 'task-service'
  }

  /**
   * Initialize consumers when the module starts
   *
   * Sets up subscriptions to all task event streams.
   * Each subscription uses a consumer group to ensure
   * events are processed exactly once even with multiple instances.
   */
  async onModuleInit() {
    if (!this.messagingEnabled) {
      this.logger.log('Messaging disabled, skipping consumer setup')
      return
    }

    this.logger.log('Setting up task event consumers...')

    // Subscribe to task created events
    await this.messageConsumer.subscribe<TaskEvent>(
      'tasks:created',
      `${this.serviceName}-created-consumer`,
      async (event) => this.handleTaskCreated(event),
      {
        validate: isTaskEvent,
        idempotency: { ttlSeconds: 86_400 },
      }
    )

    // Subscribe to task updated events
    await this.messageConsumer.subscribe<TaskEvent>(
      'tasks:updated',
      `${this.serviceName}-updated-consumer`,
      async (event) => this.handleTaskUpdated(event),
      {
        validate: isTaskEvent,
        idempotency: { ttlSeconds: 86_400 },
      }
    )

    // Subscribe to task status changed events
    await this.messageConsumer.subscribe<TaskEvent>(
      'tasks:status_changed',
      `${this.serviceName}-status-consumer`,
      async (event) => this.handleTaskStatusChanged(event),
      {
        validate: isTaskEvent,
        idempotency: { ttlSeconds: 86_400 },
      }
    )

    // Subscribe to task deleted events
    await this.messageConsumer.subscribe<TaskEvent>(
      'tasks:deleted',
      `${this.serviceName}-deleted-consumer`,
      async (event) => this.handleTaskDeleted(event),
      {
        validate: isTaskEvent,
        idempotency: { ttlSeconds: 86_400 },
      }
    )

    this.logger.log('Task event consumers initialized')
  }

  /**
   * Handle task created events
   *
   * Example: Send notification, update search index, trigger workflows
   *
   * @param event - Task created event payload
   */
  private async handleTaskCreated(event: TaskEvent): Promise<void> {
    this.logger.log(`Task created: ${event.taskId} - ${event.title}`)

    // Example processing:
    // - Send notification to assigned user
    // - Update search index
    // - Trigger automation workflows
    // - Update analytics
  }

  /**
   * Handle task updated events
   *
   * Example: Sync with external systems, invalidate caches
   *
   * @param event - Task updated event payload
   */
  private async handleTaskUpdated(event: TaskEvent): Promise<void> {
    this.logger.log(`Task updated: ${event.taskId} - ${event.title}`)

    // Example processing:
    // - Invalidate related caches
    // - Sync with external systems
    // - Update search index
  }

  /**
   * Handle task status changed events
   *
   * Example: Trigger status-specific workflows
   *
   * @param event - Task status changed event payload
   */
  private async handleTaskStatusChanged(event: TaskEvent): Promise<void> {
    this.logger.log(
      `Task status changed: ${event.taskId} - ${event.previousStatus} -> ${event.status}`
    )

    // Example processing:
    // - If COMPLETED: Calculate metrics, archive data
    // - If IN_PROGRESS: Start SLA timer
    // - If CANCELLED: Clean up related resources
  }

  /**
   * Handle task deleted events
   *
   * Example: Clean up related data, update indexes
   *
   * @param event - Task deleted event payload
   */
  private async handleTaskDeleted(event: TaskEvent): Promise<void> {
    this.logger.log(`Task deleted: ${event.taskId} - ${event.title}`)

    // Example processing:
    // - Remove from search index
    // - Clean up related files/attachments
    // - Update analytics
  }
}
