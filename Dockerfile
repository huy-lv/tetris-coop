# Multi-stage Dockerfile for Tetris Game (Client + Server)

# Stage 1: Build Client (React + Vite)
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Clean install to fix npm optional dependencies bug
RUN rm -rf node_modules package-lock.json
RUN npm install

# Copy client source code
COPY client/ ./

# Build client for production
RUN npm run build

# Stage 2: Build Server (Node.js + TypeScript)
FROM node:18-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Clean install
RUN npm install

# Copy server source code
COPY server/ ./

# Build server TypeScript
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy built server from server-builder stage
COPY --from=server-builder /app/server/dist ./server
COPY --from=server-builder /app/server/package.json ./server/

# Install only production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production
WORKDIR /app

# Install express for static server
COPY static-package.json ./package.json
RUN npm install

# Copy built client from client-builder stage
COPY --from=client-builder /app/client/dist ./client

# Copy PM2 ecosystem configuration and static server
COPY ecosystem.config.js .
COPY static-server.js .

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start both applications using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
