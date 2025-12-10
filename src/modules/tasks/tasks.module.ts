import { Module } from '@nestjs/common'

import { TasksController } from './controllers'
import { TaskConsumerService, TasksService } from './services'

/**
 * Tasks Module
 *
 * Feature module for task management in a microservice architecture.
 * Encapsulates all task-related functionality.
 *
 * Components:
 * - TasksController: HTTP request handling
 * - TasksService: Business logic, database ops, event publishing
 * - TaskConsumerService: Event consumption from Redis Streams
 *
 * Dependencies:
 * - PrismaModule: Database access (imported globally)
 * - MessagingModule: Redis Streams pub/sub (imported globally)
 */
@Module({
  controllers: [TasksController],
  providers: [TasksService, TaskConsumerService],
  exports: [TasksService],
})
export class TasksModule {}
