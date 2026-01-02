#!/bin/sh
# Restores a gzip mongodump archive into the 'zenrix' database
# Usage: ./scripts/restore_mongo.sh ./db-backups/zenrix_YYYYMMDDHHMMSS.gz
set -e
if [ -z "$1" ]; then
  echo "Usage: $0 <archive-file.gz>"
  exit 2
fi
ARCHIVE_FILE="$1"
if [ ! -f "$ARCHIVE_FILE" ]; then
  echo "Archive file not found: $ARCHIVE_FILE"
  exit 2
fi

echo "Restoring $ARCHIVE_FILE into MongoDB (this will drop existing data)..."
# Stream the archive into mongorestore on the mongo container
cat "$ARCHIVE_FILE" | docker compose exec -T mongo mongorestore --archive --gzip --drop

echo "Restore complete."
