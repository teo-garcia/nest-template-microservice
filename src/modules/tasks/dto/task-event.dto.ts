import { TaskStatus } from '../../../generated/prisma/client'

/**
 * Task Event
 *
 * Event payload published to Redis Streams when task operations occur.
 * Other microservices can subscribe to these events to react to changes.
 *
 * Event types:
 * - tasks:created - When a new task is created
 * - tasks:updated - When a task is modified
 * - tasks:deleted - When a task is removed
 * - tasks:status_changed - When task status changes (subset of updated)
 */
export class TaskEvent {
  /**
   * Event type identifier
   */
  eventType: 'created' | 'updated' | 'deleted' | 'status_changed'

  /**
   * Task ID
   */
  taskId: string

  /**
   * Task title
   */
  title: string

  /**
   * Task description (optional)
   */
  description?: string | null

  /**
   * Task status
   */
  status: TaskStatus

  /**
   * Task priority
   */
  priority: number

  /**
   * Previous status (for status_changed events)
   */
  previousStatus?: TaskStatus

  /**
   * Timestamp when the event occurred
   */
  timestamp: Date

  constructor(partial: Partial<TaskEvent>) {
    Object.assign(this, partial)
  }
}
