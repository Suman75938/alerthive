# ── Build stage ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm ci
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN sed -i 's/https/http/g' /etc/apk/repositories && apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 4000

# Apply schema directly (no migration files needed) then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
