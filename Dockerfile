# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build tools needed for some node modules (like bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./ 

# Install dependencies using npm ci (clean install based on lockfile)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove development dependencies to save space
RUN npm prune --production

# Stage 2: Runner
FROM node:20-alpine AS runner

# Install dependencies required for production
# dumb-init: for process signal handling
# postgresql-client: for pg_isready check in entrypoint
# openssl: required by Prisma Client
RUN apk add --no-cache dumb-init postgresql-client openssl

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create directories for uploads and logs
RUN mkdir -p uploads logs && chown -R node:node /app

# Copy built artifacts and necessary files from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Use non-root user for security
USER node

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 
  CMD node -e "require('http').get('http://localhost:3000/api/v1', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)}); "

# Start the application using entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
