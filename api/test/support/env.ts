// Runs before every test file: point Prisma at the TEST database, never the demo one.
// connection_limit=20 so concurrent requests really run in parallel on separate
// connections (otherwise a tiny pool would queue them and hide race conditions).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://kiosk:kiosk@localhost:5432/kiosk_test?schema=public&connection_limit=20';
