import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ApiResponseMetaDto {
  @ApiPropertyOptional({ example: '0da9708b-3168-4853-a393-7f08ed0d58a3' })
  requestId?: string

  @ApiPropertyOptional({ example: '0.0.0' })
  version?: string

  @ApiPropertyOptional({ example: 13 })
  duration?: number
}

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number

  @ApiProperty({ example: '2026-06-12T17:42:51.424Z' })
  timestamp: string

  @ApiProperty({ example: '/api/tasks/nonexistent-id' })
  path: string

  @ApiProperty({ example: 'GET' })
  method: string

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[]

  @ApiProperty({ example: 'Not Found' })
  error: string

  @ApiPropertyOptional({
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  errors?: Record<string, string[]>
}
