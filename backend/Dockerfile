# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src src
RUN npx tsc && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/prisma prisma
COPY --from=builder /app/dist dist

# The music library is not baked in (1.4 GB): the service bind-mounts the repo's
# backend/music from the VPS working copy at /app/music.
RUN mkdir -p music

EXPOSE 4101

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4101/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && npx fastify start -a 0.0.0.0 -p 4101 -l info dist/app.js"]
