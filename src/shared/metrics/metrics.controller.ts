import { Controller, Get, Header } from '@nestjs/common'

import { MetricsService } from './metrics.service'

/**
 * Metrics Controller
 *
 * Exposes Prometheus-compatible metrics endpoint at /metrics.
 * This endpoint is typically scraped by Prometheus or other monitoring systems.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Metrics Endpoint
   *
   * Returns all application metrics in Prometheus exposition format.
   * The content-type is set to text/plain as required by Prometheus.
   *
   * Example metrics output:
   * # HELP http_requests_total Total number of HTTP requests
   * # TYPE http_requests_total counter
   * http_requests_total{method="GET",route="/api/users",status="200"} 150
   *
   * # HELP http_request_duration_seconds Duration of HTTP requests in seconds
   * # TYPE http_request_duration_seconds histogram
   * http_request_duration_seconds_bucket{method="GET",route="/api/users",status="200",le="0.005"} 10
   * ...
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics()
  }
}
