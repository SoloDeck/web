# ===========================================================================
# Stage 1: Build stage
# ===========================================================================
FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2: runtime — Nginx serving built static assets
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration template for SPA support and environment variables
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV API_URL=http://api:8000
ENV NGINX_ENVSUBST_FILTER=API_URL

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
