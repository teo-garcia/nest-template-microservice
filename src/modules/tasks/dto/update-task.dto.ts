import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

import { TaskStatus } from '../../../generated/prisma/client'

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated title', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string

  @ApiPropertyOptional({ example: 'Updated description', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus

  @ApiPropertyOptional({ example: 8, minimum: 0, maximum: 10 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  priority?: number
}
