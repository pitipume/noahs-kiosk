import { IsInt, IsString, IsUUID, Length, Min } from 'class-validator';

/** Body the payment provider sends when a payment succeeds. */
export class ConfirmPaymentRequest {
  /** The provider's unique id for this confirmation. Retries reuse the same id. */
  @IsString()
  @Length(1, 100)
  eventId!: string;

  @IsUUID()
  orderId!: string;

  /** Amount the provider actually charged, in minor units (satang). */
  @IsInt()
  @Min(0)
  amountCents!: number;
}
