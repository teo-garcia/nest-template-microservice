import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete documentation', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @ApiPropertyOptional({
    example: 'Write API docs for the tasks module',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.PENDING })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 10, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  priority?: number
}
