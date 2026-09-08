# Mariposa

Restaurant management application with a Fastify/tRPC backend, Svelte frontend, and PostgreSQL database.

## Local development

Use Node.js 24 and pnpm. Configure an existing PostgreSQL database in `backend/.env`.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both files before continuing.
pnpm install
pnpm db:migrate
pnpm dev
```

Development servers run locally. Docker is used for production.

## Docker deployment

The setup follows Residanat: one multi-stage Node.js 24 image, PM2 running both servers, host networking, automatic restart, and a health check for both servers.

On a Linux host with Docker Compose, Node.js 24, Corepack, and project dependencies installed:

```bash
pnpm docker:launch
```

This applies pending migrations to the database configured in `backend/.env`, builds the image, and starts the container. It waits until both servers are healthy. It does not create or reset a database.

- Frontend: port **8000**.
- Backend: port **8100**.
- Backend environment: `backend/.env`; `DATABASE_URL` is used without an override.
- Server ports: configured in `ecosystem.config.cjs`.
- Existing `backend/storage` and `backend/data` directories remain mounted from the host.
- Admin settings persist in `backend/src/settings.json`, mounted at the compiled runtime path.

The frontend API URL is baked into the build. It defaults to `https://api.mariposa.food`; HTTP and WebSocket clients both use this URL. To change it:

```bash
VITE_API_URL=https://api.example.com pnpm docker:launch
```

Docker does not copy `.env` files into the image or read `frontend/.env` for the build. Configure the public API URL with the build variable above. Route your public frontend and API domains to ports 8000 and 8100 respectively, including WebSocket upgrades for the API.

```bash
pnpm docker:logs    # View container logs
pnpm docker:ps      # Show container status
pnpm docker:stop    # Stop the application
```

`pnpm docker:start` and `pnpm docker:prod` are aliases for `pnpm docker:launch`.

## Database commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

See [GAMMA_FILES_SETUP.md](GAMMA_FILES_SETUP.md) for Gamma file storage configuration.
