import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MessageConsumerService } from '../../../shared/messaging'

/**
 * Order Consumer Service
 *
 * Demonstrates how to consume messages from Redis Streams.
 * This service subscribes to events from OTHER microservices.
 *
 * Example scenarios:
 * - Listen to payment:completed events to update order status
 * - Listen to inventory:reserved events to confirm order
 * - Listen to shipping:dispatched events to notify customer
 */
@Injectable()
export class OrderConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OrderConsumerService.name)

  constructor(
    private readonly messageConsumer: MessageConsumerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Subscribe to message streams when the module initializes
   */
  async onModuleInit(): Promise<void> {
    // Check if messaging is enabled
    const messagingEnabled =
      this.configService.get<boolean>('config.features.enableMessaging') ?? true

    if (!messagingEnabled) {
      this.logger.log('Messaging is disabled, skipping subscriptions')
      return
    }

    // Subscribe to payment completed events
    // In a real microservice architecture, the payment service would publish these
    await this.subscribeToPaymentEvents()

    // Subscribe to inventory events
    await this.subscribeToInventoryEvents()
  }

  /**
   * Subscribe to payment events
   */
  private async subscribeToPaymentEvents(): Promise<void> {
    try {
      await this.messageConsumer.subscribe(
        'payments:completed',
        'order-service',
        async (message: any) => {
          await this.handlePaymentCompleted(message)
        },
      )
      this.logger.log('Subscribed to payments:completed stream')
    } catch (error) {
      this.logger.error('Failed to subscribe to payment events:', error)
    }
  }

  /**
   * Subscribe to inventory events
   */
  private async subscribeToInventoryEvents(): Promise<void> {
    try {
      await this.messageConsumer.subscribe(
        'inventory:reserved',
        'order-service',
        async (message: any) => {
          await this.handleInventoryReserved(message)
        },
      )
      this.logger.log('Subscribed to inventory:reserved stream')
    } catch (error) {
      this.logger.error('Failed to subscribe to inventory events:', error)
    }
  }

  /**
   * Handle payment completed event
   *
   * When payment is completed, update order status and proceed with fulfillment
   */
  private async handlePaymentCompleted(message: any): Promise<void> {
    this.logger.log(`Payment completed for order ${message.orderId}`)

    // In a real application:
    // 1. Update order status in database
    // 2. Trigger fulfillment process
    // 3. Send confirmation email
    // 4. Update inventory

    // For demo, just log the event
    this.logger.debug('Payment details:', JSON.stringify(message))
  }

  /**
   * Handle inventory reserved event
   *
   * When inventory is reserved, confirm the order can proceed
   */
  private async handleInventoryReserved(message: any): Promise<void> {
    this.logger.log(`Inventory reserved for order ${message.orderId}`)

    // In a real application:
    // 1. Update order status
    // 2. Proceed with payment if inventory is confirmed
    // 3. Handle case where inventory couldn't be reserved

    // For demo, just log the event
    this.logger.debug('Inventory details:', JSON.stringify(message))
  }
}
