# ============================================================
# GASTONAPP - DOCKERFILE MULTI-STAGE PARA DOKPLOY
# ============================================================

# ------------------------------------------------------------
# Etapa 1: Compilación de la aplicación web (Builder)
# ------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias respetando el lockfile
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar la SPA
COPY . .
RUN npm run build

# ------------------------------------------------------------
# Etapa 2: Entorno de ejecución de producción (Runner)
# ------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar artefactos compilados y servidor de la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/telegram-bot ./telegram-bot
COPY --from=builder /app/package.json ./package.json
COPY server.mjs ./

# Volumen persistente para datos, respaldos o credenciales locales
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Puerto expuesto por defecto en Dokploy
EXPOSE 3000

# Verificación de salud periódica para Dokploy / Docker Engine
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Comando de inicio: levanta el servidor web SPA y el supervisor del agente
CMD ["node", "server.mjs"]
