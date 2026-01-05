import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  timestamp: string
  path: string
  method: string
  data: T
  meta?: {
    requestId?: string
    version?: string
    duration?: number
  }
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly logger = new Logger(TransformInterceptor.name)

  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const startTime = Date.now()
    const context_ = context.switchToHttp()
    const request = context_.getRequest<Request>()
    const response = context_.getResponse<Response>()
    const env =
      this.configService.get<string>('config.app.env') ?? 'development'
    const version =
      this.configService.get<string>('config.service.version') ?? '0.0.0'
    const requestId =
      typeof (request as { id?: unknown }).id === 'string'
        ? (request as { id?: string }).id
        : undefined

    return next.handle().pipe(
      map((data: T) => {
        const endTime = Date.now()
        const duration = endTime - startTime

        const transformedResponse: ApiResponse<T> = {
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          data,
          meta: {
            requestId,
            version,
            duration,
          },
        }

        // Log successful requests in development
        if (env === 'development') {
          const requestLabel = requestId ? ` ${requestId}` : ''
          this.logger.debug(
            `${request.method} ${request.url} ${response.statusCode} - ${duration}ms${requestLabel}`
          )
        }

        return transformedResponse
      })
    )
  }
}
