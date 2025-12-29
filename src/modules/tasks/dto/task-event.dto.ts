import { randomUUID } from 'node:crypto'

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
   * Event ID for idempotency and tracing
   */
  eventId: string

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
    this.eventId = partial.eventId ?? randomUUID()
  }
}

export const isTaskEvent = (value: unknown): value is TaskEvent => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const event = value as Record<string, unknown>
  const eventType = event.eventType
  const isValidType =
    eventType === 'created' ||
    eventType === 'updated' ||
    eventType === 'deleted' ||
    eventType === 'status_changed'

  const hasTimestamp =
    typeof event.timestamp === 'string' || event.timestamp instanceof Date

  return (
    typeof event.eventId === 'string' &&
    isValidType &&
    typeof event.taskId === 'string' &&
    typeof event.title === 'string' &&
    typeof event.status === 'string' &&
    typeof event.priority === 'number' &&
    hasTimestamp
  )
}
