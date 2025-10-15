import { Module } from '@nestjs/common'

import { MessagingModule } from '../../shared/messaging'
import { OrdersController } from './controllers'
import { OrderConsumerService, OrdersService } from './services'

/**
 * Orders Module
 *
 * Example domain module demonstrating microservice patterns:
 * - REST API endpoints (OrdersController)
 * - Business logic (OrdersService)
 * - Event publishing (via MessageProducerService)
 * - Event consumption (OrderConsumerService)
 *
 * This module shows how to structure a feature in a microservice architecture.
 */
@Module({
  imports: [MessagingModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderConsumerService],
  exports: [OrdersService],
})
export class OrdersModule {}



