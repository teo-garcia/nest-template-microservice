/**
 * Order Created Event
 *
 * Published to Redis Stream when a new order is created.
 * Other microservices can subscribe to this event to react to order creation.
 *
 * Examples:
 * - Inventory service: Reserve stock
 * - Notification service: Send confirmation email
 * - Analytics service: Track order metrics
 */
export class OrderCreatedEvent {
  orderId: string
  userId: string
  productId: string
  quantity: number
  price: number
  totalAmount: number
  createdAt: Date

  constructor(partial: Partial<OrderCreatedEvent>) {
    Object.assign(this, partial)
  }
}
