#!/usr/bin/env bash
# Rollback: MySQL cannot downgrade 8.4 data files to 8.0 in place, so we restore the
# volume copy made by backup.sh and go back to the 8.0 image.
# Usage: db/upgrade/rollback.sh [STAMP]   (default: the one in backups/LATEST)
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: do not rewrite /data style paths
cd "$(dirname "$0")/../.."
STAMP="${1:-$(cat backups/LATEST)}"
FILE="backups/mysql-data-8.0-$STAMP.tgz"
test -f "$FILE"

docker compose stop product-service user-service inventory-service mysql
docker run --rm -i -v marketplace_mysql-data:/data alpine \
  sh -c 'find /data -mindepth 1 -delete && tar xzf - -C /data' < "$FILE"
echo "== volume restored from $FILE"

sed -i 's#image: mysql:8.4#image: mysql:8.0#' docker-compose.yml
docker compose up -d
echo "== back on MySQL 8.0, wait for healthy then run db/upgrade/counts.sh"
