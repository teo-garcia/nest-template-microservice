import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import { TaskStatus } from '../../../generated/prisma/client'
import { CreateTaskDto, UpdateTaskDto } from '../dto'
import { TasksService } from '../services'

/**
 * Tasks Controller
 *
 * Handles HTTP requests for task operations.
 * Demonstrates RESTful API design in a microservice.
 *
 * Endpoints:
 * - POST   /tasks      - Create a new task (publishes event)
 * - GET    /tasks      - Get all tasks (with optional filters)
 * - GET    /tasks/:id  - Get a specific task
 * - PATCH  /tasks/:id  - Update a task (publishes event)
 * - DELETE /tasks/:id  - Delete a task (publishes event)
 *
 * All write operations publish events to Redis Streams,
 * allowing other microservices to react to changes.
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Create a new task
   *
   * @param createTaskDto - Task data from request body
   * @returns Created task
   *
   * Example request:
   * POST /api/tasks
   * {
   *   "title": "Complete documentation",
   *   "description": "Write API docs for the tasks module",
   *   "priority": 5
   * }
   *
   * Publishes: tasks:created event
   */
  @Post()
  async create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto)
  }

  /**
   * Get all tasks with optional filtering
   *
   * @param status - Optional filter by task status
   * @param priority - Optional filter for minimum priority
   * @returns Array of tasks
   *
   * Examples:
   * GET /api/tasks
   * GET /api/tasks?status=PENDING
   * GET /api/tasks?priority=5
   * GET /api/tasks?status=IN_PROGRESS&priority=3
   */
  @Get()
  async findAll(
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string
  ) {
    // Parse priority to number if provided
    const priorityNum = priority ? Number.parseInt(priority, 10) : undefined
    return this.tasksService.findAll(status, priorityNum)
  }

  /**
   * Get a specific task by ID
   *
   * @param id - Task ID from URL parameter
   * @returns Task data
   * @throws NotFoundException if task not found
   *
   * Example:
   * GET /api/tasks/clx1234567890
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id)
  }

  /**
   * Update a task
   *
   * @param id - Task ID from URL parameter
   * @param updateTaskDto - Fields to update
   * @returns Updated task
   * @throws NotFoundException if task not found
   *
   * Example request:
   * PATCH /api/tasks/clx1234567890
   * {
   *   "status": "COMPLETED"
   * }
   *
   * Publishes: tasks:updated or tasks:status_changed event
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto)
  }

  /**
   * Delete a task
   *
   * @param id - Task ID from URL parameter
   * @returns Deleted task
   * @throws NotFoundException if task not found
   *
   * Example:
   * DELETE /api/tasks/clx1234567890
   *
   * Publishes: tasks:deleted event
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(id)
  }
}
