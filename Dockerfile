FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS builder
COPY index.html vite.config.js jsconfig.json ./
COPY src ./src
COPY public ./public
COPY tests ./tests
RUN npm test && npm run build

FROM nginx:1.31.8-alpine-slim AS production
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
