import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

import { MetricsService } from './metrics.service'

/**
 * Metrics Interceptor
 *
 * Automatically records metrics for all HTTP requests.
 * Captures the request method, route, status code, and duration.
 *
 * This interceptor should be registered globally in main.ts to track all requests.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP requests
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Record the start time
    const startTime = Date.now()

    // Continue with the request and record metrics after completion
    return next.handle().pipe(
      tap({
        next: () => {
          // Calculate duration in seconds
          const duration = (Date.now() - startTime) / 1000

          // Extract request information
          const method = request.method
          const route = request.route?.path || request.url // Use route.path for cleaner metrics
          const status = response.statusCode

          // Record the metrics
          this.metricsService.recordHttpRequest(method, route, status, duration)
        },
        error: () => {
          // Record metrics even for failed requests
          const duration = (Date.now() - startTime) / 1000
          const method = request.method
          const route = request.route?.path || request.url
          const status = response.statusCode || 500

          this.metricsService.recordHttpRequest(method, route, status, duration)
        },
      })
    )
  }
}
