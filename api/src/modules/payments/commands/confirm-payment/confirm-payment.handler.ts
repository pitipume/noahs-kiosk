import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentsManager } from '../../managers/payments.manager';
import { ConfirmPaymentCommand } from './confirm-payment.command';
import { ConfirmPaymentResponse } from './confirm-payment.response';

@CommandHandler(ConfirmPaymentCommand)
export class ConfirmPaymentHandler implements ICommandHandler<
  ConfirmPaymentCommand,
  ConfirmPaymentResponse
> {
  constructor(
    private readonly paymentsManager: PaymentsManager
  ) {}

  async execute(
    command: ConfirmPaymentCommand,
  ): Promise<ConfirmPaymentResponse> {
    const outcome = await this.paymentsManager.confirmPayment(
      command.eventId,
      command.orderId,
      command.amountCents,
    );
    return {
      result: outcome.result,
      orderId: command.orderId,
      orderStatus: outcome.orderStatus,
      note: outcome.note,
    };
  }
}
