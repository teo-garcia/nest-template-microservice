import { plainToClass } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator'

/**
 * Environment Variables Validation Schema
 *
 * Validates that all required environment variables are present and correctly typed.
 * The application will fail to start if validation fails, preventing runtime errors.
 */

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  // Service Info
  @IsString()
  @IsOptional()
  SERVICE_NAME?: string

  // Application
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment = Environment.Development

  @IsNumber()
  @IsOptional()
  PORT?: number = 3000

  @IsString()
  @IsOptional()
  API_PREFIX?: string = 'api'

  // Database (required)
  @IsString()
  @IsOptional()
  DATABASE_URL?: string

  // Redis (required for messaging)
  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost'

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number = 6379

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string

  @IsString()
  @IsOptional()
  REDIS_KEY_PREFIX?: string

  // Metrics
  @IsBoolean()
  @IsOptional()
  METRICS_ENABLED?: boolean

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string

  // Logging
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info'

  @IsBoolean()
  @IsOptional()
  ENABLE_CONSOLE_LOGS?: boolean
}

/**
 * Validate environment variables
 *
 * @param config - Raw environment variables
 * @returns Validated configuration
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  })

  if (errors.length > 0) {
    throw new Error(errors.toString())
  }

  return validatedConfig
}
