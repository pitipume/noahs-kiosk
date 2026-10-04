import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { ConfirmPaymentCommand } from './commands/confirm-payment/confirm-payment.command';
import { ConfirmPaymentRequest } from './commands/confirm-payment/confirm-payment.request';
import { ConfirmPaymentResponse } from './commands/confirm-payment/confirm-payment.response';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly commandBus: CommandBus
  ) {}

  // Called by the payment provider (webhook). Always 200 for a processed event,
  // including DUPLICATE: a 2xx tells the provider "got it, stop retrying".
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Body() body: ConfirmPaymentRequest,
  ): Promise<ConfirmPaymentResponse> {
    return this.commandBus.execute(
      new ConfirmPaymentCommand(body.eventId, body.orderId, body.amountCents),
    );
  }
}
