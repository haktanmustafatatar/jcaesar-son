# Stage 1: Build
FROM node:22-alpine AS builder
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
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start"]
