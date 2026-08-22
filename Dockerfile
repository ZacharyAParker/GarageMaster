# ---- Build stage: compile the SPA with Vite ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached until package files change)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy sources and build the production bundle
COPY . .
RUN npm run build

# ---- Runtime stage: serve static assets on nginx ----
FROM nginx:1.27-alpine AS runtime

# SPA fallback + cache headers for hashed assets
RUN rm /etc/nginx/conf.d/default.conf
COPY <<'EOF' /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Hashed asset filenames are content-addressed -> cache hard
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Client-side routing fallback (Calendar, Quotes, Invoices, ...)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
