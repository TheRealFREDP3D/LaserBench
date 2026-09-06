# ── Build stage: compile the Vite bundle ─────────────────────────────────────
FROM node:24.20.0-alpine AS build

# pnpm via corepack, pinned to packageManager in package.json.
# COREPACK_ENABLE_DOWNLOAD_PROMPT=0: skip corepack's interactive
# "download pnpm@11.25.0?" prompt, which hangs non-interactive builds.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /app

# Install dependencies with a reproducible lockfile
# (pnpm-workspace.yaml carries the build-approval list — required for non-interactive installs)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the production bundle
COPY . .
RUN pnpm run build

# ── Runtime stage: static hosting via nginx ──────────────────────────────────
FROM nginx:1.31.5-alpine

# SPA routing + hashed-asset caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built bundle
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
