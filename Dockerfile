# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY rollup.config.js ./

# Build application
RUN npm run build

# Production stage
FROM nginx:1.27.4-alpine-slim

# Create nginx configuration
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/public /usr/share/nginx/html/

EXPOSE 80
