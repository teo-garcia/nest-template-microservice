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

  @IsNumber()
  @IsOptional()
  SHUTDOWN_TIMEOUT?: number

  // Database (required)
  @IsString()
  @IsOptional()
  DATABASE_URL?: string

  // NATS (required for governed async messaging)
  @IsString()
  @IsOptional()
  NATS_URL?: string = 'nats://localhost:4222'

  @IsString()
  @IsOptional()
  NATS_CLIENT_NAME?: string

  @IsString()
  @IsOptional()
  NATS_SUBJECT_PREFIX?: string

  @IsString()
  @IsOptional()
  NATS_STREAM_PREFIX?: string

  @IsNumber()
  @IsOptional()
  NATS_TIMEOUT?: number

  @IsNumber()
  @IsOptional()
  NATS_ACK_WAIT_SECONDS?: number

  @IsNumber()
  @IsOptional()
  NATS_MAX_MESSAGES?: number

  @IsNumber()
  @IsOptional()
  NATS_MAX_RECONNECT_ATTEMPTS?: number

  @IsNumber()
  @IsOptional()
  NATS_RECONNECT_TIME_WAIT?: number

  // Redis (cache/rate limiting/jobs/idempotency)
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

  // Rate Limiting
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL?: number

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT?: number

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

  if (
    validatedConfig.NODE_ENV === Environment.Production ||
    validatedConfig.NODE_ENV === Environment.Staging
  ) {
    const missingRequired = ['DATABASE_URL', 'NATS_URL'].filter(
      (key) => typeof config[key] !== 'string' || config[key] === ''
    )

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingRequired.join(', ')}`
      )
    }

    if (!validatedConfig.CORS_ORIGIN || validatedConfig.CORS_ORIGIN === '*') {
      throw new Error(
        'CORS_ORIGIN must be explicit in production-like environments'
      )
    }
  }

  return validatedConfig
}
