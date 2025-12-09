import { Global, Module } from "@nestjs/common";

import { MetricsController } from "./metrics.controller";
import { MetricsInterceptor } from "./metrics.interceptor";
import { MetricsService } from "./metrics.service";

/**
 * Metrics Module
 *
 * Provides Prometheus-compatible metrics collection and exposure.
 * This module is global to allow any service to access MetricsService for custom metrics.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
