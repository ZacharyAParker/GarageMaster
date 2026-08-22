# ---- Build stage: compile the SPA with Vite ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime stage: API server + static assets in one container ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server/index.js"]
