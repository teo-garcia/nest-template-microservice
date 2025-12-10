import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

import { TaskStatus } from '../../../generated/prisma/client'

/**
 * Update Task DTO
 *
 * Validates incoming data for task updates.
 * All fields are optional since updates can be partial.
 */
export class UpdateTaskDto {
  /**
   * Task title (optional)
   * Must be a non-empty string with max 255 characters if provided
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string

  /**
   * Task description (optional)
   * Longer text describing the task details
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string

  /**
   * Task status (optional)
   * Must be a valid TaskStatus enum value
   */
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus

  /**
   * Task priority (optional)
   * Higher numbers indicate higher priority
   * Range: 0-10
   */
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  priority?: number
}
