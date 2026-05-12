FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /app

ARG BASE_URL
ENV VITE_BASE=${BASE_URL}

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.13-alpine AS runner

WORKDIR /app

ARG BASE_URL
ENV BASE_URL=${BASE_URL}

COPY package.json bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5173
CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]