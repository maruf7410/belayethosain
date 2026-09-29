# Multi-stage production container for 24/7 continuous API uptime
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install curl for native container healthcheck probes
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs

# Dedicated unprivileged user
USER node

# Expose service port
EXPOSE 3000

# 24/7 Healthcheck Probe for Kubernetes / Cloud Run / Docker Compose
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["npm", "start"]
