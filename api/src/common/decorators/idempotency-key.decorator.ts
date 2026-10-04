import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

const MAX_LENGTH = 100; // matches orders.idempotency_key VARCHAR(100)

/**
 * Reads the optional `Idempotency-Key` header (like a model binder in .NET).
 * Usage: `place(@IdempotencyKey() key: string | undefined)`
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const value = ctx
      .switchToHttp()
      .getRequest<Request>()
      .header('idempotency-key');
    if (value === undefined) return undefined;
    if (value.trim().length === 0 || value.length > MAX_LENGTH) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Request is invalid',
        errors: [`Idempotency-Key header must be 1-${MAX_LENGTH} characters`],
      });
    }
    return value;
  },
);
