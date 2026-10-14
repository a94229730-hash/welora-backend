# Multi-stage production container for Welora Avatar AI
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN echo "legacy-peer-deps=true" > .npmrc
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN echo "legacy-peer-deps=true" > .npmrc
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

RUN npm install -g tsx

EXPOSE 8080

CMD ["tsx", "server.ts"]