import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Global input validation (the FluentValidation pipeline of this app).
 * Runs the class-validator decorators on every Request DTO before the controller.
 * Shared by main.ts and the tests so both behave the same.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true, // strip unknown fields
    forbidNonWhitelisted: true, // ...and reject requests that send them
    transform: true, // turn the JSON body into the DTO class (so nested rules run)
    exceptionFactory: (errors) =>
      new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Request is invalid',
        errors: errors.flatMap((e) => flatten(e)),
      }),
  });
}

// Nested DTOs (lines[0].quantity) report errors on children; flatten to "lines.0.quantity: ..."
function flatten(error: ValidationError, parent = ''): string[] {
  const path = parent ? `${parent}.${error.property}` : error.property;
  const own = Object.values(error.constraints ?? {}).map(
    (msg) => `${path}: ${msg}`,
  );
  return [...own, ...(error.children ?? []).flatMap((c) => flatten(c, path))];
}
