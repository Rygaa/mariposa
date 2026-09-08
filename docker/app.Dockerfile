FROM node:24-bookworm-slim AS build

RUN npm install --global pnpm@11.19.0

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY backend ./backend
COPY frontend ./frontend
ARG VITE_API_URL=https://api.mariposa.food
RUN VITE_API_URL="$VITE_API_URL" pnpm build

FROM node:24-bookworm-slim

RUN npm install --global pm2

WORKDIR /app
COPY ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/package.json ./frontend/package.json
COPY --from=build /app/frontend/node_modules ./frontend/node_modules
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/frontend/server.js ./frontend/server.js

ENV NODE_ENV=production
EXPOSE 8000 8100

CMD ["pm2-runtime", "ecosystem.config.cjs"]
