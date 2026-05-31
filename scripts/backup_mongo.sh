#!/bin/sh
# Creates a gzip mongodump of the 'fashionhub' database and stores it in ./db-backups
set -e
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
OUT_DIR="./db-backups"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/fashionhub_$TIMESTAMP.gz"

echo "Creating mongodump to $OUT_FILE..."
# Stream the archive from the mongo container to host file
docker compose exec -T mongo mongodump --archive --gzip --db=fashionhub > "$OUT_FILE"

echo "Backup created: $OUT_FILE"
