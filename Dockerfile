# Finora — ishlab chiqarish uchun konteyner (PHASE 10).
# Ko'p bosqichli (multi-stage) qurilish: birinchi bosqichda bog'liqliklar o'rnatiladi,
# ikkinchisida esa faqat kerakli fayllar va ishlab chiqarish (production) bog'liqliklari qoladi —
# yakuniy tasvir (image) kichikroq va xavfsizroq bo'ladi (devDependencies, kesh va h.k. kirmaydi).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `node:sqlite` Node yadrosida — native kompilyatsiya shart emas, shuning uchun bu yerda
# build-base kabi qo'shimcha paketlar kerak emas.
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Ildiz (root) emas, maxsus foydalanuvchi ostida ishga tushadi.
RUN addgroup -S finora && adduser -S finora -G finora

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY client ./client
COPY shared ./shared
COPY scripts ./scripts

# SQLite bazasi shu papkada saqlanadi — konteynerdan tashqarida volume sifatida ulanishi mumkin
# (masalan: docker run -v finora_data:/app/server/data ...), aks holda konteyner o'chirilganda
# ma'lumot yo'qoladi.
RUN mkdir -p /app/server/data && chown -R finora:finora /app/server/data
VOLUME ["/app/server/data"]

USER finora
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "server/server.js"]
