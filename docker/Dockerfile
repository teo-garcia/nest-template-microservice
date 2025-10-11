# ================================
# Build Stage
# ================================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy prisma schema (if database is enabled)
COPY prisma ./prisma
RUN pnpm db:generate || echo "Prisma schema not found, skipping generation"

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Remove development dependencies
RUN pnpm prune --prod

# ================================
# Production Stage
# ================================
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user and group
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder (production only)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy prisma files (if needed)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma 2>/dev/null || :

# Copy package.json for version info
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose the application port
EXPOSE 3000

# Health check
# Uses the /health/live endpoint to verify the service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to run the application
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
