export class ConfirmPaymentCommand {
  constructor(
    public readonly eventId: string,
    public readonly orderId: string,
    public readonly amountCents: number,
  ) {}
}
