import { Injectable, LoggerService, Scope } from '@nestjs/common'
import { Logger as WinstonLogger } from 'winston'

type LogMetadata = Record<string, unknown>

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string

  constructor(private readonly logger: WinstonLogger) {}

  setContext(context: string): void {
    this.context = context
  }

  log(message: string, ...meta: LogMetadata[]): void {
    this.logger.info(message, { context: this.context, ...meta })
  }

  error(message: string, trace?: string, ...meta: LogMetadata[]): void {
    this.logger.error(message, { context: this.context, trace, ...meta })
  }

  warn(message: string, ...meta: LogMetadata[]): void {
    this.logger.warn(message, { context: this.context, ...meta })
  }

  debug(message: string, ...meta: LogMetadata[]): void {
    this.logger.debug(message, { context: this.context, ...meta })
  }

  verbose(message: string, ...meta: LogMetadata[]): void {
    this.logger.verbose(message, { context: this.context, ...meta })
  }
}
