import { Injectable } from '@nestjs/common'
import { Counter, Histogram, register, Registry } from 'prom-client'

/**
 * Metrics Service
 *
 * Provides Prometheus-compatible metrics collection for the application.
 * Tracks HTTP requests, response times, and custom business metrics.
 *
 * Key metrics collected:
 * - http_requests_total: Counter for total HTTP requests by method, route, and status
 * - http_request_duration_seconds: Histogram of HTTP request durations
 */
@Injectable()
export class MetricsService {
  private readonly registry: Registry
  private readonly httpRequestCounter: Counter<string>
  private readonly httpRequestDuration: Histogram<string>

  constructor() {
    // Create a new registry for this service
    // This allows us to have isolated metrics per service in a microservice architecture
    this.registry = new Registry()

    // HTTP Request Counter
    // Counts total number of HTTP requests grouped by method, route, and status code
    // Example: http_requests_total{method="GET",route="/api/users",status="200"} 150
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    })

    // HTTP Request Duration Histogram
    // Tracks response times with configurable buckets (in seconds)
    // Buckets: 0.005s, 0.01s, 0.025s, 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s, 10s
    // This allows us to calculate percentiles (p50, p95, p99) and average response times
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    })

    // Register default metrics (process CPU, memory, event loop lag, etc.)
    // These are useful for monitoring the Node.js process health
    register.setDefaultLabels({
      app: 'nest-monolith',
    })
  }

  /**
   * Record an HTTP request
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param route - Route path (e.g., /api/users)
   * @param status - HTTP status code (200, 404, 500, etc.)
   * @param duration - Request duration in seconds
   */
  recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number
  ): void {
    const labels = { method, route, status: status.toString() }

    // Increment the request counter
    this.httpRequestCounter.inc(labels)

    // Record the duration in the histogram
    this.httpRequestDuration.observe(labels, duration)
  }

  /**
   * Get metrics in Prometheus format
   *
   * Returns all metrics as a string in Prometheus exposition format.
   * This can be scraped by Prometheus or other compatible monitoring systems.
   */
  async getMetrics(): Promise<string> {
    // Merge application metrics with default Node.js metrics
    return await Registry.merge([this.registry, register]).metrics()
  }

  /**
   * Get the registry instance
   *
   * Allows other services to register custom metrics
   */
  getRegistry(): Registry {
    return this.registry
  }
}
