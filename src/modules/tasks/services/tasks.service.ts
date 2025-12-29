import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Task, TaskStatus } from '../../../generated/prisma/client'
import { MessageProducerService } from '../../../shared/messaging'
import { PrismaService } from '../../../shared/prisma'
import { CreateTaskDto, TaskEvent, UpdateTaskDto } from '../dto'

/**
 * Tasks Service
 *
 * Handles all business logic for task operations.
 * Demonstrates microservice patterns:
 * - CRUD operations with Prisma
 * - Event publishing to Redis Streams
 * - Integration with other services via messaging
 *
 * Events published:
 * - tasks:created - When a new task is created
 * - tasks:updated - When a task is modified
 * - tasks:deleted - When a task is removed
 * - tasks:status_changed - When task status changes
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)
  private readonly databaseEnabled: boolean
  private readonly serviceName: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageProducer: MessageProducerService,
    private readonly configService: ConfigService
  ) {
    this.databaseEnabled = this.configService.get<boolean>('config.database.enabled') ?? false
    this.serviceName = this.configService.get<string>('config.service.name') ?? 'microservice'
  }

  /**
   * Create a new task
   *
   * 1. Validates the task data (handled by DTO validation)
   * 2. Creates the task record in the database
   * 3. Publishes TaskCreatedEvent to Redis Stream
   *
   * @param createTaskDto - Task data from request body
   * @returns The created task
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    this.logger.log(`Creating task: ${createTaskDto.title}`)

    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status ?? TaskStatus.PENDING,
        priority: createTaskDto.priority ?? 0,
      },
    })

    // Publish event to Redis Stream
    // Other microservices can subscribe to react to task creation
    await this.publishEvent(
      new TaskEvent({
        eventType: 'created',
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        timestamp: new Date(),
      })
    )

    this.logger.log(`Created task with ID: ${task.id}`)
    return task
  }

  /**
   * Find all tasks with optional filtering
   *
   * @param status - Optional status filter
   * @param priority - Optional minimum priority filter
   * @returns Array of tasks matching the criteria
   */
  async findAll(status?: TaskStatus, priority?: number): Promise<Task[]> {
    this.logger.debug(`Finding tasks with status=${status}, priority=${priority}`)

    // Build dynamic where clause based on provided filters
    const where: { status?: TaskStatus; priority?: { gte: number } } = {}

    if (status) {
      where.status = status
    }

    if (priority !== undefined) {
      where.priority = { gte: priority }
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
  }

  /**
   * Find a single task by ID
   *
   * @param id - Task ID
   * @returns The task
   * @throws NotFoundException if task not found
   */
  async findOne(id: string): Promise<Task> {
    this.logger.debug(`Finding task with ID: ${id}`)

    const task = await this.prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`)
    }

    return task
  }

  /**
   * Update a task
   *
   * Publishes different events based on what changed:
   * - tasks:status_changed if status changed
   * - tasks:updated for any other changes
   *
   * @param id - Task ID
   * @param updateTaskDto - Fields to update
   * @returns The updated task
   * @throws NotFoundException if task not found
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`)

    // Get current task to check for status change
    const currentTask = await this.findOne(id)

    const task = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    })

    // Determine event type based on what changed
    const statusChanged = updateTaskDto.status && updateTaskDto.status !== currentTask.status

    await this.publishEvent(
      new TaskEvent({
        eventType: statusChanged ? 'status_changed' : 'updated',
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        previousStatus: statusChanged ? currentTask.status : undefined,
        timestamp: new Date(),
      })
    )

    this.logger.log(`Updated task with ID: ${id}`)
    return task
  }

  /**
   * Delete a task
   *
   * @param id - Task ID
   * @returns The deleted task
   * @throws NotFoundException if task not found
   */
  async remove(id: string): Promise<Task> {
    this.logger.log(`Deleting task with ID: ${id}`)

    // First check if task exists
    const currentTask = await this.findOne(id)

    const task = await this.prisma.task.delete({
      where: { id },
    })

    // Publish deletion event
    await this.publishEvent(
      new TaskEvent({
        eventType: 'deleted',
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: currentTask.status,
        priority: currentTask.priority,
        timestamp: new Date(),
      })
    )

    this.logger.log(`Deleted task with ID: ${id}`)
    return task
  }

  /**
   * Publish a task event to Redis Streams
   *
   * @param event - The event to publish
   */
  private async publishEvent(event: TaskEvent): Promise<void> {
    const stream = `tasks:${event.eventType}`

    try {
      await this.messageProducer.publish(stream, event, {
        idempotencyKey: event.eventId,
        schemaVersion: 1,
        eventType: event.eventType,
        source: this.serviceName,
      })
      this.logger.debug(`Published ${stream} event for task ${event.taskId}`)
    } catch (error) {
      // Log but don't throw - event publishing shouldn't break the main operation
      // In production, you might want to implement a retry mechanism or dead letter queue
      this.logger.error(`Failed to publish ${stream} event:`, error)
    }
  }
}
