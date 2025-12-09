import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { CreateOrderDto } from "../dto";
import { OrdersService } from "../services";

/**
 * Orders Controller
 *
 * Handles HTTP requests for order operations.
 * Demonstrates RESTful API design in a microservice.
 *
 * Endpoints:
 * - POST /orders: Create a new order
 * - GET /orders: Get all orders (optionally filtered by userId)
 * - GET /orders/:id: Get a specific order
 */
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order
   *
   * @param createOrderDto - Order data from request body
   * @returns Created order
   *
   * Example request:
   * POST /api/orders
   * {
   *   "userId": "user_123",
   *   "productId": "prod_456",
   *   "quantity": 2,
   *   "price": 29.99
   * }
   */
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return await this.ordersService.create(createOrderDto);
  }

  /**
   * Get all orders or filter by user
   *
   * @param userId - Optional query parameter to filter by user
   * @returns Array of orders
   *
   * Examples:
   * GET /api/orders
   * GET /api/orders?userId=user_123
   */
  @Get()
  async findAll(@Query("userId") userId?: string) {
    if (userId) {
      return await this.ordersService.findByUserId(userId);
    }
    return await this.ordersService.findAll();
  }

  /**
   * Get a specific order by ID
   *
   * @param id - Order ID from URL parameter
   * @returns Order data
   * @throws NotFoundException if order not found
   *
   * Example:
   * GET /api/orders/order_1234567890_abc123
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
}
