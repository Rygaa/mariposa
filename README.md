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

The app follows the PM2 setup of Residanat: one multi-stage Node.js 24 image running both servers, host networking, automatic restart, and a health check. Mariposa also has a PostgreSQL 18 container with the persistent `mariposa-db` volume.

### Move the existing database into Docker

Run these commands on the machine that holds the database configured in `backend/.env`. You need PostgreSQL 18 client tools (`pg_dump`, `pg_restore`, `psql`), Docker Compose, Node.js 24, Corepack, and installed project dependencies.

```bash
pnpm db:backup
```

The backup is a timestamped custom PostgreSQL archive in `backups/`, with a SHA-256 checksum. The command checks that the archive can be read. Backups and generated credentials are ignored by Git and Docker builds.

Before the move, stop every app or worker that writes to the original database. Keep those writers stopped until the new app passes its health checks. Then run:

```bash
pnpm db:move
pnpm docker:launch
```

`db:move` makes a fresh backup, starts PostgreSQL on `127.0.0.1:5434`, refuses a nonempty target, and restores in one transaction. It generates private Docker credentials and activates `.env.docker` only after the restore succeeds. It leaves the original database and `backend/.env` unchanged. A failed move leaves `.env.docker.pending` for retry; do not delete it because it contains the credentials of the new volume.

The app switches to Docker PostgreSQL when `docker:launch` starts it. Do not restart the old app against the original database after the switch. This is a one-time copy, not continuous replication.

### Later deployments

On the same Linux host:

```bash
pnpm docker:launch
```

This starts the existing Docker database, applies pending migrations to it, builds the app image, and waits until both servers are healthy. It reuses the database volume and does not repeat the import.

- Frontend: port **8000**.
- Backend: port **8100**.
- Backend environment: `backend/.env`, with `DATABASE_URL` overridden by `.env.docker` for production.
- PostgreSQL: `127.0.0.1:5434`, persistent volume `mariposa-db` (PostgreSQL 18 mount: `/var/lib/postgresql`).
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
pnpm docker:stop    # Stop the app and database; retain the database volume
```

`pnpm docker:start` and `pnpm docker:prod` are aliases for `pnpm docker:launch`.

## Database commands

After the move, `db:backup` backs up the Docker database. Local `db:migrate` and `db:studio` still use `backend/.env`; production migrations run through `docker:launch`. Never use `docker compose down -v` for a normal restart: it deletes the database volume.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

See [GAMMA_FILES_SETUP.md](GAMMA_FILES_SETUP.md) for Gamma file storage configuration.
