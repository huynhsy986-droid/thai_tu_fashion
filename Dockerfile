# Thai Tu Fashion · 1 container: API (Express) + frontend tĩnh. Database = Supabase (bên ngoài).
FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/frontend \
    TRUST_PROXY=1
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY frontend/index.html frontend/favicon.svg ./frontend/
COPY frontend/css ./frontend/css
COPY frontend/js ./frontend/js
COPY frontend/img ./frontend/img
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
WORKDIR /app/backend
CMD ["node", "src/server.js"]
