FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .


# ---------------------------------------------------------------------------
# Stage: test — lint + typecheck + unit tests (used by CI)
# ---------------------------------------------------------------------------
FROM builder AS test

# No additional install needed — node_modules already present from builder


# ---------------------------------------------------------------------------
# Stage: runtime — production image serving the built static assets
# ---------------------------------------------------------------------------
FROM builder AS runtime-build

RUN bun run build

FROM oven/bun:1.3.13-alpine AS runtime

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json bun.lock ./
COPY --from=runtime-build /app/node_modules ./node_modules
COPY --from=runtime-build /app/dist ./dist

ARG WEB_PORT=5173
ENV PORT=${WEB_PORT}

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["sh", "-c", "bun run preview -- --host 0.0.0.0 --port ${PORT}"]
