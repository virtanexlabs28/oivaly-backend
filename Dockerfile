# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install native build tools required for native modules (e.g. bcrypt)
RUN apk add --no-cache python3 make g++ gcc

# Copy package manifests
COPY package.json ./
COPY bun.lock* package-lock.json* ./

# Install all dependencies (including devDependencies for NestJS compilation)
RUN npm install --legacy-peer-deps

# Copy application source code and compiler configurations
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Compile NestJS TypeScript into /app/dist
RUN npm run build

# Remove devDependencies to produce a lean production node_modules
RUN npm prune --omit=dev --legacy-peer-deps

# ── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4040

# Security: Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production node_modules from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
# Copy compiled output
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
# Copy package.json (essential for "type": "module" ESM resolution)
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 4040

# Start NestJS application
CMD ["node", "dist/main.js"]

