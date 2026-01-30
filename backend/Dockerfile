# Backend Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY backend ./backend

WORKDIR /app/backend

# Build the backend
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and necessary runtime files
COPY --from=base /app/backend/dist ./backend/dist
COPY --from=base /app/backend/drizzle ./backend/drizzle
COPY backend/server.js ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/tsconfig.json ./backend/

WORKDIR /app/backend

# Create storage directories
RUN mkdir -p storage/files storage/menuItems

EXPOSE 3000

CMD ["node", "server.js"]
