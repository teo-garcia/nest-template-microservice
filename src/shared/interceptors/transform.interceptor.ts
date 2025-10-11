import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
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
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name)

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const startTime = Date.now()
    const context_ = context.switchToHttp()
    const request = context_.getRequest<Request>()
    const response = context_.getResponse<Response>()

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
            requestId: this.generateRequestId(),
            version: '1.0',
            duration,
          },
        }

        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(
            `${request.method} ${request.url} ${response.statusCode} - ${duration}ms`
          )
        }

        return transformedResponse
      })
    )
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomUUID()}`
  }
}
