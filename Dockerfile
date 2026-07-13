# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only manifests first (Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Stage 2: Final production image ───────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling inside container
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source + package.json
COPY package.json ./
COPY backend/ ./backend/

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/src/server.js"]
