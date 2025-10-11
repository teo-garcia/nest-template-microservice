import { Injectable, Logger } from '@nestjs/common'

import { MessageProducerService } from '../../../shared/messaging'
import { CreateOrderDto, OrderCreatedEvent } from '../dto'

/**
 * Orders Service
 *
 * Handles business logic for orders.
 * Demonstrates how to:
 * - Process REST API requests
 * - Publish events to Redis Streams
 * - Integrate with other services via messaging
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)
  private readonly orders = new Map<string, OrderCreatedEvent>() // In-memory store for demo

  constructor(private readonly messageProducer: MessageProducerService) {}

  /**
   * Create a new order
   *
   * 1. Validates the order data (handled by DTO validation)
   * 2. Creates the order record
   * 3. Publishes OrderCreatedEvent to Redis Stream
   *
   * @param createOrderDto - Order data
   * @returns Created order
   */
  async create(createOrderDto: CreateOrderDto): Promise<OrderCreatedEvent> {
    this.logger.log(`Creating order for user ${createOrderDto.userId}`)

    // Generate order ID (in real app, this might come from database)
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // Calculate total amount
    const totalAmount = createOrderDto.quantity * createOrderDto.price

    // Create order object
    const order = new OrderCreatedEvent({
      orderId,
      userId: createOrderDto.userId,
      productId: createOrderDto.productId,
      quantity: createOrderDto.quantity,
      price: createOrderDto.price,
      totalAmount,
      createdAt: new Date(),
    })

    // Store order (in real app, save to database)
    this.orders.set(orderId, order)

    // Publish event to Redis Stream
    // Other microservices can subscribe to this stream to react to order creation
    try {
      await this.messageProducer.publish('orders:created', order)
      this.logger.log(`Published OrderCreatedEvent for order ${orderId}`)
    } catch (error) {
      this.logger.error('Failed to publish OrderCreatedEvent:', error)
      // In production, you might want to implement a retry mechanism
      // or store the event for later publishing
    }

    return order
  }

  /**
   * Find order by ID
   *
   * @param id - Order ID
   * @returns Order or undefined
   */
  async findOne(id: string): Promise<OrderCreatedEvent | undefined> {
    return this.orders.get(id)
  }

  /**
   * Find all orders
   *
   * @returns Array of all orders
   */
  async findAll(): Promise<OrderCreatedEvent[]> {
    return Array.from(this.orders.values())
  }

  /**
   * Find orders by user ID
   *
   * @param userId - User ID
   * @returns Array of user's orders
   */
  async findByUserId(userId: string): Promise<OrderCreatedEvent[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    )
  }
}

