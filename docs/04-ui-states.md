# 04 — UI states: what the customer sees

Goal: for every outcome, the customer knows **what happened**, **whether they were charged**, and **what to do next**. The backend's guarantees (no overselling, exactly-once payment) only help if the screen tells the truth about them.

Copy rules: plain words, no error codes or jargon on screen, always one clear next step.

## Menu page

| State | What the customer sees |
|---|---|
| Loading the page | Nothing special. The page is server-rendered, so it arrives with data already in it. |
| Menu can't be loaded (API down) | **"The menu is unavailable right now."** "Please try again in a moment." + **[Try again]** button (`app/error.tsx`) |
| Item in stock | Name, price (`฿65.00`), "**12 in stock**", quantity selector, **[Order]** |
| Low stock (≤ 3) | "**Only 2 left**", highlighted so the customer knows to hurry |
| Sold out (0) | "**Sold out**", quantity and button disabled |
| Stock changed by another customer | Updates by itself within ~5 seconds (auto-refresh) |

Quantity selector: 1 to `min(10, stock)`. The server still re-checks, because the screen can be a few seconds stale.

## Placing an order

| Outcome | API result | Message shown (near the item) | Next step for customer |
|---|---|---|---|
| Waiting | (request in flight) | Button → **"Placing your order…"**, disabled | Wait (double-clicks are blocked) |
| ✅ Success | 201 | **"Order placed!"** Order **#3F9A12C0** · 2 × Iced Latte · Total **฿130.00** · Status: **Waiting for payment** | "Please complete payment at the payment terminal." |
| ❌ Sold out (lost the race) | 409 `OUT_OF_STOCK`, `available: 0` | **"Sorry, Iced Latte just sold out."** "Someone ordered the last one a moment before you. You have not been charged." | Choose another item (the card now shows Sold out) |
| ❌ Not enough left | 409 `OUT_OF_STOCK`, `available: 2` | **"Only 2 Iced Latte left."** "Please lower the quantity and try again. You have not been charged." | Lower quantity, order again |
| ❌ Item removed | 404 `MENU_ITEM_NOT_FOUND` | **"This item is no longer on the menu."** "You have not been charged." | Choose another item (page refreshed) |
| ❌ Invalid input | 400 `VALIDATION_FAILED` | **"Please choose a quantity between 1 and 10."** | Fix quantity |
| ⚠️ Timeout / network / server error | 5xx or no response in 5 s | **"We couldn't confirm your order."** "Please tap Try again. You won't be charged twice." + **[Try again]** | Tap Try again (same idempotency key, so it's safe) |

**Why "You have not been charged" is safe to say:** orders are placed *before* payment (status PENDING), and every 4xx above means the transaction rolled back, so no order exists.

**Why "Try again" is safe here:** on a timeout we don't know whether the order was created. The retry sends the **same idempotency key**, so if the first attempt did create the order, the API returns that order instead of making a second one (03-flows.md §4). If it keeps failing, the message after the 2nd failure adds "If this keeps happening, please ask staff." There's no hard retry cap: retries are safe, so blocking the customer would only leave them stuck (retry policy reasoning in 03-flows.md §4). While retrying, the quantity is locked to the original attempt; **[Start over]** clears it and starts a fresh order.

## Payment
Payment happens on the provider's terminal, not on this page. The menu page shows the order as **"Waiting for payment"**. Showing the live PAID status to the customer is out of scope for the brief, and it's listed under "next".
