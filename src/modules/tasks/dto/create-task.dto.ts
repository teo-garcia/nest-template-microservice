import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

import { TaskStatus } from '../../../generated/prisma/client'

/**
 * Create Task DTO
 *
 * Validates incoming data for task creation.
 * Uses class-validator decorators for automatic validation.
 */
export class CreateTaskDto {
  /**
   * Task title (required)
   * Must be a non-empty string with max 255 characters
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  /**
   * Task description (optional)
   * Longer text describing the task details
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string

  /**
   * Task status (optional, defaults to PENDING)
   * Must be a valid TaskStatus enum value
   */
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus

  /**
   * Task priority (optional, defaults to 0)
   * Higher numbers indicate higher priority
   * Range: 0-10
   */
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  priority?: number
}
