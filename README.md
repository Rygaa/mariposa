# Mariposa

Full-stack restaurant management application with backend API and frontend interface.

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide for all environments
- **[MIGRATION.md](MIGRATION.md)** - Environment migration and transfer guide
- **[README.Docker.md](README.Docker.md)** - Docker setup and commands
- **[GAMMA_FILES_SETUP.md](GAMMA_FILES_SETUP.md)** - Gamma Files SDK configuration

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
pnpm quick:start
```

This will:
1. Set up your environment configuration
2. Verify all prerequisites
3. Start Docker containers
4. Run database migrations
5. Perform health checks

### Option 2: Manual Setup

#### Local Development

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit with your configuration

# 2. Start database
pnpm docker:dev

# 3. Install dependencies
pnpm install

# 4. Run migrations
pnpm db:migrate

# 5. Start development servers
pnpm dev
```

**Access:**
- Frontend: http://localhost:5174
- Backend: http://localhost:3000

#### Docker Deployment

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit with your configuration

# 2. Start all services
pnpm docker:up

# 3. Run migrations
docker-compose exec backend pnpm db:migrate

# 4. Verify health
pnpm health
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

## 🛠 Available Commands

### Development
```bash
pnpm dev                 # Run both frontend and backend
pnpm dev:backend         # Run backend only
pnpm dev:frontend        # Run frontend only
```

### Database
```bash
pnpm db:generate         # Generate new migration
pnpm db:migrate          # Apply migrations
pnpm db:push             # Push schema changes (dev only)
pnpm db:studio           # Open Drizzle Studio
pnpm backup:db           # Create database backup
pnpm restore:db          # Restore database from backup
```

### Docker
```bash
pnpm docker:dev          # Start database only
pnpm docker:up           # Start all services
pnpm docker:down         # Stop all services
pnpm docker:logs         # View container logs
pnpm docker:build        # Rebuild images
pnpm docker:prod         # Start production stack
```

### Utilities
```bash
pnpm setup:env           # Interactive environment setup
pnpm check:deploy        # Verify deployment readiness
pnpm health              # Check service health
pnpm build               # Build all packages
pnpm clean               # Clean node_modules and dist
```

## 📁 Project Structure

```
mariposa/
├── backend/              # Backend API (Express + tRPC)
│   ├── src/             # Source code
│   ├── drizzle/         # Database migrations
│   ├── storage/         # File storage
│   └── Dockerfile       # Backend container
├── frontend/            # Frontend (Svelte)
│   ├── src/             # Source code
│   └── Dockerfile       # Frontend container
├── scripts/             # Utility scripts
│   ├── setup-env.sh     # Environment setup
│   ├── pre-deploy-check.sh  # Deployment verification
│   ├── backup-db.sh     # Database backup
│   └── health-check.sh  # Health checks
├── docker-compose.yml   # Production Docker config
├── docker-compose.dev.yml   # Development Docker config
├── docker-compose.prod.yml  # Production with optimizations
└── .env.example         # Environment template
```

## 🔧 Environment Configuration

The project uses **separate environment files** for backend and frontend:

**Backend:** `backend/.env` (copy from `backend/.env.example`)
**Frontend:** `frontend/.env` (copy from `frontend/.env.example`)

### Setup

```bash
# Quick setup
./scripts/setup-env.sh

# Or manually
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit with your values
```

### Required Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<secure-random-string>
PORT=3000
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🔐 Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use separate configs** - Backend and frontend have separate `.env` files
3. **Generate strong secrets** for production:
   ```bash
   openssl rand -base64 32  # For JWT_SECRET
   ```
4. **Use strong database passwords** in production
5. **Enable HTTPS** for production deployments
6. **Regularly update dependencies**

## 🚢 Deployment

### Production Deployment

```bash
# 1. Verify configuration
pnpm check:deploy

# 2. Deploy
pnpm docker:prod

# 3. Run migrations
docker-compose -f docker-compose.prod.yml exec backend pnpm db:migrate

# 4. Verify
pnpm health
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Cloud Platforms

The project can be deployed to:
- AWS (ECS, EC2, RDS)
- Google Cloud Platform (Cloud Run, Cloud SQL)
- DigitalOcean (App Platform, Droplets)
- Any Docker-compatible hosting

See [DEPLOYMENT.md](DEPLOYMENT.md) for platform-specific guides.

## 🔄 Moving Between Environments

Need to move your project to a new server or environment? See [MIGRATION.md](MIGRATION.md) for comprehensive guides on:

- Local to production migration
- Server-to-server transfers
- Database migration strategies
- Secrets management
- Rollback procedures

## 🧪 Database Management

### Create Migration
```bash
# 1. Edit backend/src/db/schema.ts
# 2. Generate migration
pnpm db:generate
# 3. Apply migration
pnpm db:migrate
```

### Backup & Restore
```bash
# Create backup
pnpm backup:db

# Restore backup
pnpm restore:db
```

Backups are stored in `./backups/` directory.

## 🏥 Health Checks

```bash
# Check all services
pnpm health

# Manual checks
curl http://localhost:3000/health  # Backend
curl http://localhost:3001/health  # Frontend
```

## 🐛 Troubleshooting

### Port conflicts
Change ports in `.env`:
```env
BACKEND_PORT=3001
FRONTEND_PORT=3002
POSTGRES_PORT=5433
```

### Database connection issues
```bash
# Check database status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
pnpm db:migrate
```

### Container issues
```bash
# View logs
pnpm docker:logs

# Rebuild containers
pnpm docker:build
pnpm docker:up
```

For more troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📊 Tech Stack

**Backend:**
- Node.js 20
- Fastify
- tRPC
- Drizzle ORM
- PostgreSQL 16
- WebSocket support

**Frontend:**
- Svelte 5
- Vite
- TailwindCSS
- tRPC Client

**DevOps:**
- Docker & Docker Compose
- pnpm workspaces
- Multi-stage builds

## 📝 License

ISC

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally: `pnpm dev`
4. Test with Docker: `pnpm docker:up`
5. Run pre-deployment checks: `pnpm check:deploy`
6. Submit pull request

## 📞 Support

- Check documentation in project root
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- Review [MIGRATION.md](MIGRATION.md) for migration issues
- Check service health: `pnpm health`
- View logs: `pnpm docker:logs`
