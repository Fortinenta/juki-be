# Stage 1: Builder
FROM node:20-alpine AS builder

# Install pnpm and necessary build tools
RUN npm install -g pnpm && apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./ 

# Install dependencies (frozen lockfile ensures consistent installs)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma:generate

# Build the application
RUN pnpm build

# Stage 2: Runner
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
# Install postgresql-client for DB checks (optional but useful) and openssl for Prisma
RUN apk add --no-cache dumb-init postgresql-client openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install Prisma CLI globally for migrations
RUN npm install -g prisma

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directories for uploads and logs, and set ownership
RUN mkdir -p uploads logs && chown -R node:node /app

# Use non-root user for security
USER node

# Expose the application port
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)}); "

# Start the application using entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]