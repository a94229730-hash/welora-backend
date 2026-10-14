# Multi-stage production container for Welora Avatar AI
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including build tools
RUN npm install

# Copy application source code
COPY . .

# Build client-side assets to /app/dist
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

# Install tsx globally for production TypeScript execution
RUN npm install -g tsx

EXPOSE 8080

# Cloud Run / Render container entrypoint
CMD ["tsx", "server.ts"]
