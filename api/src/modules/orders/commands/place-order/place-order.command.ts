export interface OrderLineInput {
  menuItemId: number;
  quantity: number;
}

export class PlaceOrderCommand {
  constructor(
    public readonly lines: OrderLineInput[],
    public readonly idempotencyKey?: string,
  ) {}
}
