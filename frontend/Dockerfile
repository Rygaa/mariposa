# Frontend Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy frontend and backend package.json
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend and backend source (frontend needs backend schema)
COPY frontend ./frontend
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

WORKDIR /app/frontend

# Build the frontend
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and server
COPY --from=base /app/frontend/dist ./frontend/dist
COPY frontend/server.js ./frontend/

WORKDIR /app/frontend

EXPOSE 3001

CMD ["node", "server.js"]
