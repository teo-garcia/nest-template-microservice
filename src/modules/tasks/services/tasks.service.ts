import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { Task, TaskStatus } from '../../../generated/prisma/client'
import { PrismaService } from '../../../shared/prisma'
import { CreateTaskDto, UpdateTaskDto } from '../dto'

/**
 * Tasks Service
 *
 * Handles all business logic for task operations.
 * Demonstrates microservice patterns:
 * - CRUD operations with Prisma
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new task
   *
   * 1. Validates the task data (handled by DTO validation)
   * 2. Creates the task record in the database
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
    this.logger.debug(
      `Finding tasks with status=${status}, priority=${priority}`
    )

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
   * @param id - Task ID
   * @param updateTaskDto - Fields to update
   * @returns The updated task
   * @throws NotFoundException if task not found
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`)

    // Get current task to check for status change
    await this.findOne(id)

    const task = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    })

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
    await this.findOne(id)

    const task = await this.prisma.task.delete({
      where: { id },
    })

    this.logger.log(`Deleted task with ID: ${id}`)
    return task
  }
}
