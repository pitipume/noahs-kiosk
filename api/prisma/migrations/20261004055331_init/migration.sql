-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "payment_event_result" AS ENUM ('APPLIED', 'IGNORED');

-- CreateTable
CREATE TABLE "menu_item" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(100),
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "total_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line" (
    "id" SERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,

    CONSTRAINT "order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_event" (
    "id" SERIAL NOT NULL,
    "provider_event_id" VARCHAR(100) NOT NULL,
    "order_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "result" "payment_event_result" NOT NULL,
    "note" VARCHAR(200),
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "order_line_order_id_idx" ON "order_line"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_event_provider_event_id_key" ON "payment_event"("provider_event_id");

-- CreateIndex
CREATE INDEX "payment_event_order_id_idx" ON "payment_event"("order_id");

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_event" ADD CONSTRAINT "payment_event_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- Hand-written: CHECK constraints (Prisma schema can't express these).
-- Last line of defence: even buggy app code can never store negative
-- stock or a zero/negative quantity. The app's conditional UPDATE is
-- the primary protection (docs/03-flows.md §2).
-- ---------------------------------------------------------------
ALTER TABLE "menu_item"  ADD CONSTRAINT "menu_item_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "menu_item"  ADD CONSTRAINT "menu_item_price_non_negative" CHECK ("price_cents" >= 0);
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_quantity_positive" CHECK ("quantity" > 0);
