# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 100000 && \
    npm config set fetch-retries 10 && \
    npm install

# Copy source and generate prisma client
COPY . .
RUN npx prisma generate

# Build the application
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts

# Expose port
EXPOSE 3000

# Start command using optimized standalone production server
CMD ["node", "server.js"]
