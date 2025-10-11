import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator'

/**
 * Create Order DTO
 *
 * Defines the shape and validation rules for creating a new order.
 * Uses class-validator decorators for automatic validation.
 */
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsNumber()
  @IsPositive()
  quantity: number

  @IsNumber()
  @IsPositive()
  price: number
}
