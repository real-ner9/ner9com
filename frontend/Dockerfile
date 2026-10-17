# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Same-origin API: nginx below proxies /api/* to the backend.
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Backend service hostname is injected at runtime via env.
ENV BACKEND_HOST=ner9-backend
ENV BACKEND_PORT=4101

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
