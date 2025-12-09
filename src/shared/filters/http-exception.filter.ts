import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response } from "express";

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  errors?: Record<string, string[]>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle HTTP exceptions (including validation errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === "object" &&
        exceptionResponse != undefined
      ) {
        const responseObject = exceptionResponse as Record<string, unknown>;

        return {
          statusCode: status,
          timestamp,
          path,
          method,
          message: responseObject.message as string | string[],
          error: responseObject.error as string,
          errors: responseObject.errors as Record<string, string[]>,
        };
      }

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message:
          typeof exceptionResponse === "string"
            ? exceptionResponse
            : "An error occurred",
        error: exception.name,
      };
    }

    // Handle Prisma database errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, method);
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: "Internal server error",
      error: "InternalServerError",
    };
  }

  private handlePrismaError(
    exception: PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    switch (exception.code) {
      case "P2002": {
        // Unique constraint violation
        return {
          statusCode: HttpStatus.CONFLICT,
          timestamp,
          path,
          method,
          message: "A record with this value already exists",
          error: "ConflictError",
        };
      }

      case "P2025": {
        // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          timestamp,
          path,
          method,
          message: "Record not found",
          error: "NotFoundError",
        };
      }

      case "P2003": {
        // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp,
          path,
          method,
          message: "Invalid reference to related record",
          error: "BadRequestError",
        };
      }

      default: {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp,
          path,
          method,
          message: "Database error occurred",
          error: "DatabaseError",
        };
      }
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { statusCode, message, path, method } = errorResponse;
    const userAgent = request.get("User-Agent") || "";
    const ip = request.ip || request.socket.remoteAddress;

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${path} ${statusCode} - ${ip} ${userAgent}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${path} ${statusCode} - ${ip} ${userAgent} - ${JSON.stringify(message)}`,
      );
    }
  }
}
