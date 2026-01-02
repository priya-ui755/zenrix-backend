# Docker: Zenrix Backend

Build and run with Docker Compose (starts the app + MongoDB):

```bash
docker compose up --build
```

The app will be available at http://localhost:3000. Mongo data is stored in a Docker volume named `mongo-data`.

Run only the app image (no compose):

```bash
docker build -t zenrix-backend:latest .
docker run -e MONGODB_URI="mongodb://host.docker.internal:27017/zenrix" -p 3000:3000 zenrix-backend:latest
```

Notes:
- Provide secrets (like `JWT_SECRET` and `ADMIN_PASSWORD`) via a `.env` file or CI environment variables rather than the defaults in `docker-compose.yml`.
- To persist uploads, mount the `uploads/` folder as a volume in `docker-compose.yml`.

Seeding and env file
- Copy `.env.example` to `.env` and edit values locally.

```bash
cp .env.example .env
```

- Start services (Compose will use `.env`):

```bash
docker compose up --build -d
```

- Run the seeder (one-off) to populate richer test data:

```bash
docker compose run --rm seeder
```

- If you prefer to seed from the `app` image:

```bash
docker compose run --rm app node db-backup/seed-data.js
```

MongoDB Backup & Restore
- Create a compressed backup of the `zenrix` database (saves to `./db-backups`):

```bash
./scripts/backup_mongo.sh
```

- Restore an archive into the database (will drop existing DB data):

```bash
./scripts/restore_mongo.sh db-backups/zenrix_YYYYMMDDHHMMSS.gz
```

Uploads (MinIO)
- Start MinIO along with other services:

```bash
docker compose up -d minio
```

- Sync local `uploads/` to the MinIO bucket named `zenrix`:

```bash
./scripts/sync_uploads_minio.sh
```

- MinIO console: http://localhost:9001 (use `minioadmin`/`minioadmin` by default). Change credentials in `docker-compose.yml` or via env vars in production.

Notes:
- The backup/restore scripts stream data through the `mongo` container using `docker compose exec`. Ensure the `mongo` service is running before using them.
- For production backups, schedule `./scripts/backup_mongo.sh` with cron and upload archives to remote storage (S3, network share, etc.).

VS Code Dev Container
- You can open the project in a consistent containerized dev environment using VS Code Remote - Containers.

1. Install the `Remote - Containers` extension in VS Code.
2. Open the repository in VS Code and select `Reopen in Container` when prompted (or use the command palette).

The devcontainer uses the existing `docker-compose.yml` and attaches to the `app` service. It runs `npm install` after creating the container.


