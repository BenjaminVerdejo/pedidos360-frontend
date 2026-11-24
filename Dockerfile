# syntax=docker/dockerfile:1
# ---------- Etapa 1: compilacion de Angular ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Etapa 2: servidor web sin privilegios ----------
# nginx-unprivileged: corre con usuario no root y escucha en el puerto 8080.
# 1.27-alpine (Alpine 3.21.3) tenia 3 CVE CRITICAL con parche (brotli, OpenSSL)
# detectados por Trivy en el pipeline -> se actualiza la base y se aplican parches del SO.
FROM nginxinc/nginx-unprivileged:1.31-alpine
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-pedidos360/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD ["wget", "-qO-", "http://localhost:8080/"]