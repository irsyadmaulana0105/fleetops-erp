# syntax=docker/dockerfile:1
#
# FleetOps ERP — image produksi (Next.js 15 + Prisma 7 + PostgreSQL).
# Dipakai oleh docker-compose.yml / Coolify. Migrasi database dijalankan otomatis
# saat container start lewat docker-entrypoint.sh.

FROM node:22-alpine AS base
# openssl dibutuhkan schema engine Prisma (migrate deploy); libc6-compat untuk binari native di Alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── 1. Dependensi ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Build ───────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `prisma generate` membaca DATABASE_URL lewat prisma.config.ts tetapi TIDAK membuka koneksi,
# jadi nilai palsu ini cukup untuk build. URL asli diberikan saat container berjalan.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Variabel NEXT_PUBLIC_* ditanam saat build — ubah lewat build args jika perlu.
ARG NEXT_PUBLIC_APP_NAME="FleetOps ERP"
ARG NEXT_PUBLIC_COMPANY_NAME="PT Forklift Solusindo Utama"
ENV DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_COMPANY_NAME=$NEXT_PUBLIC_COMPANY_NAME \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build && npm prune --omit=dev

# ── 3. Runtime ─────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Folder penyimpanan foto & tanda tangan. Pasang volume di sini (lihat docker-compose.yml) agar berkas tidak hilang saat container dibuat ulang.
ENV STORAGE_DIR=/app/storage
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
