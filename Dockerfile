# =======================================================
# Multi-Stage Production Dockerfile for WorkSphere
# =======================================================

# Stage 1: Build the React 19 Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Install Server Dependencies and Generate Prisma Client
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma/ ./prisma/
RUN npm install
RUN npx prisma generate

# Stage 3: Final Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy server files
COPY server/package*.json ./server/
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/src ./server/src
COPY server/prisma ./server/prisma

# Copy built frontend assets for unified hosting
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "server/src/server.js"]
