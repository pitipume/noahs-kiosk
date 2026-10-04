import { Injectable } from '@nestjs/common';
import { PaymentEventResult } from '@prisma/client';
import { Tx } from '../../../common/prisma/prisma.service';

/** The only place that writes SQL for `payment_event`. */
@Injectable()
export class PaymentsRepository {
  /**
   * INSERT ... ON CONFLICT (provider_event_id) DO NOTHING
   * If another transaction is inserting the same eventId right now, Postgres
   * waits for it to finish, then does nothing. Never two rows for one event.
   * @returns true if this call inserted the event, false if it already existed.
   */
  async tryInsertEvent(
    db: Tx,
    event: {
      providerEventId: string;
      orderId: string;
      amountCents: number;
      result: PaymentEventResult;
    },
  ): Promise<boolean> {
    const { count } = await db.paymentEvent.createMany({
      data: [event],
      skipDuplicates: true,
    });
    return count === 1;
  }

  async markIgnored(
    db: Tx,
    providerEventId: string,
    note: string,
  ): Promise<void> {
    await db.paymentEvent.update({
      where: { providerEventId },
      data: { result: PaymentEventResult.IGNORED, note },
    });
  }
}
