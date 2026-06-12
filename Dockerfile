# ===========================================================================
# Stage 1: Build stage
# ===========================================================================
FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /app

# Build arguments (VITE_* variables must be present at build time)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

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

ENV API_HOST=api
ENV API_PORT=8000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
