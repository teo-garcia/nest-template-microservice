import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { TaskStatus } from '../../../generated/prisma/client'
import { ApiResponseMetaDto } from '../../../shared/dto'

export class TaskResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string

  @ApiProperty({ example: 'Complete documentation' })
  title: string

  @ApiPropertyOptional({
    example: 'Write API docs for the tasks module',
    nullable: true,
  })
  description: string | null

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING })
  status: TaskStatus

  @ApiProperty({ example: 5 })
  priority: number

  @ApiProperty({ example: '2026-06-12T17:42:51.424Z', format: 'date-time' })
  createdAt: Date

  @ApiProperty({ example: '2026-06-12T17:42:51.424Z', format: 'date-time' })
  updatedAt: Date
}

export class TaskApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ example: '2026-06-12T17:42:51.424Z' })
  timestamp: string

  @ApiProperty({ example: '/api/tasks/clx1234567890' })
  path: string

  @ApiProperty({ example: 'GET' })
  method: string

  @ApiProperty({ type: TaskResponseDto })
  data: TaskResponseDto

  @ApiPropertyOptional({ type: ApiResponseMetaDto })
  meta?: ApiResponseMetaDto
}

export class TaskListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean

  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ example: '2026-06-12T17:42:51.424Z' })
  timestamp: string

  @ApiProperty({ example: '/api/tasks' })
  path: string

  @ApiProperty({ example: 'GET' })
  method: string

  @ApiProperty({ type: TaskResponseDto, isArray: true })
  data: TaskResponseDto[]

  @ApiPropertyOptional({ type: ApiResponseMetaDto })
  meta?: ApiResponseMetaDto
}
