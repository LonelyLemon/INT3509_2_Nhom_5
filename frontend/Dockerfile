# ============================================================
# Multi-stage Dockerfile for MarketMind Frontend
#   Targets:
#     - dev        : Vite dev server with hot-reload (source mounted as volume)
#     - build      : compile static assets
#     - production : serve compiled assets via nginx
# ============================================================

# ---- STAGE 1: dev ----
FROM node:20-alpine AS dev

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source (overridable by volume in docker-compose.dev.yml)
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]


# ---- STAGE 2: build ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Accept API URL at build time (baked into the static bundle)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


# ---- STAGE 3: production ----
FROM nginx:1.27-alpine AS production

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing config (all paths → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
