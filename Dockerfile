# ── Build stage: compile the Vite bundle ─────────────────────────────────────
FROM node:22-alpine AS build

# pnpm is bundled via corepack (ships with Node 22)
RUN corepack enable

WORKDIR /app

# Install dependencies with a reproducible lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the production bundle
COPY . .
RUN pnpm run build

# ── Runtime stage: static hosting via nginx ──────────────────────────────────
FROM nginx:alpine

# SPA routing + hashed-asset caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built bundle
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
