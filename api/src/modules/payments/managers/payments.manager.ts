import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentEventResult } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrdersRepository } from '../../orders/repositories/orders.repository';
import { PaymentsRepository } from '../repositories/payments.repository';
import { ConfirmPaymentResult } from '../commands/confirm-payment/confirm-payment.response';

export interface ConfirmPaymentOutcome {
  result: ConfirmPaymentResult;
  orderStatus: OrderStatus;
  note?: string;
}

@Injectable()
export class PaymentsManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  /**
   * Confirms an order's payment exactly once, no matter how many times, how late,
   * or in what order the provider sends confirmations. Two layers:
   *  1. Same eventId again      -> UNIQUE(provider_event_id) makes the insert a no-op -> DUPLICATE
   *  2. Different event, same order -> conditional UPDATE (WHERE status = 'PENDING') lets only one win
   * Flow + reasoning: docs/03-flows.md §3.
   */
  confirmPayment(
    eventId: string,
    orderId: string,
    amountCents: number,
  ): Promise<ConfirmPaymentOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.ordersRepository.findById(tx, orderId);
      if (!order) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: `Order ${orderId} does not exist`,
          orderId,
        });
      }

      // Record the event first: this is the dedupe step. Stored as APPLIED for now and
      // corrected below if it changes nothing; nobody outside this transaction can
      // see the intermediate value.
      const isNewEvent = await this.paymentsRepository.tryInsertEvent(tx, {
        providerEventId: eventId,
        orderId,
        amountCents,
        result: PaymentEventResult.APPLIED,
      });
      if (!isNewEvent) {
        return { result: 'DUPLICATE', orderStatus: order.status };
      }

      if (amountCents !== order.totalCents) {
        const note = `Amount mismatch: expected ${order.totalCents}, got ${amountCents}`;
        await this.paymentsRepository.markIgnored(tx, eventId, note);
        return { result: 'IGNORED', orderStatus: order.status, note };
      }

      const markedPaid = await this.ordersRepository.markPaidIfPending(
        tx,
        orderId,
      );
      if (!markedPaid) {
        // Another event already paid this order (possibly in a concurrent transaction).
        const note = 'Order is not PENDING (already paid)';
        await this.paymentsRepository.markIgnored(tx, eventId, note);
        return { result: 'IGNORED', orderStatus: OrderStatus.PAID, note };
      }

      return { result: 'APPLIED', orderStatus: OrderStatus.PAID };
    });
  }
}
