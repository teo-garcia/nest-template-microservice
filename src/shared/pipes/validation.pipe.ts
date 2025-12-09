import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
  Type,
} from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError, ValidatorOptions } from "class-validator";

@Injectable()
export class GlobalValidationPipe implements PipeTransform {
  private readonly logger = new Logger(GlobalValidationPipe.name);

  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    // Skip validation for primitive types
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToInstance(
      metatype as ClassConstructor<unknown>,
      value,
    );

    // Validate the object
    const validatorOptions: ValidatorOptions = {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
    };

    const errors = await validate(object as object, validatorOptions);

    if (errors.length > 0) {
      const errorMessages = this.formatValidationErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(errorMessages)}`);

      throw new BadRequestException({
        message: "Validation failed",
        errors: errorMessages,
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: Type<unknown>): boolean {
    const types: Type<unknown>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    for (const error of errors) {
      const property = error.property;
      const constraints = error.constraints;

      if (constraints) {
        formattedErrors[property] = Object.values(constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatValidationErrors(error.children);
        for (const nestedProperty of Object.keys(nestedErrors)) {
          const nestedErrorMessages = nestedErrors[nestedProperty];
          if (nestedErrorMessages) {
            formattedErrors[`${property}.${nestedProperty}`] =
              nestedErrorMessages;
          }
        }
      }
    }

    return formattedErrors;
  }
}
