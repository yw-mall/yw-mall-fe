# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@latest --quiet

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build:h5

FROM nginx:1.27-alpine
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
