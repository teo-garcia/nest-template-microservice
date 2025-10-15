import { randomUUID } from 'node:crypto'

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'

/**
 * Request ID Interceptor
 * 
 * Generates or extracts a unique request ID for each HTTP request.
 * This ID is useful for:
 * - Tracking requests across services (distributed tracing)
 * - Correlating logs from the same request
 * - Debugging production issues
 * 
 * The request ID is:
 * 1. Extracted from the X-Request-ID header if present
 * 2. Generated as a UUID if not present
 * 3. Attached to the request object for use in controllers/services
 * 4. Included in the response header for client-side tracing
 * 
 * In a microservice architecture, services should propagate the same
 * request ID when making calls to other services.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP requests
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Extract or generate request ID
    // Check the X-Request-ID header first (common convention)
    // If not present, generate a new UUID
    const requestId = request.headers['x-request-id'] || randomUUID()

    // Attach the request ID to the request object
    // This makes it accessible in controllers, services, and guards
    request.id = requestId

    // Include the request ID in the response headers
    // This allows clients to reference the request ID in support requests
    response.setHeader('X-Request-ID', requestId)

    return next.handle()
  }
}

