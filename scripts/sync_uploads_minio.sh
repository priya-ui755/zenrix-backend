#!/bin/sh
# Sync local ./uploads/ directory to MinIO bucket 'zenrix'
# Requires docker compose services to be up (minio)
set -e

# Configure minio alias and mirror uploads directory
echo "Configuring MinIO client and syncing uploads/..."

docker compose run --rm minio-client sh -c '
  mc alias set local http://minio:9000 minioadmin minioadmin && 
  mc mb --ignore-existing local/zenrix && 
  mc mirror --overwrite /workspace/uploads/ local/zenrix
'

echo "Uploads synced to MinIO (bucket: zenrix)."
