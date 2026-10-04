# Simple single-stage image: keeps dev dependencies so the same container can
# seed the DB (ts-node), run the tests and the payment simulator.
# Trade-off: bigger image than a multi-stage production build (fine for a take-home).
FROM node:22-slim
# Prisma's query engine needs OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps first (cached layer: only re-runs when package files change)
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3001
# On every start: apply migrations, seed only if the menu is empty, start the API
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main"]
