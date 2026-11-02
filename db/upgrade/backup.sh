#!/usr/bin/env bash
# Step 1: back up before the upgrade.
#   - logical backup with mysqldump (portable, can be loaded into any MySQL version)
#   - copy of the whole data volume (exact copy, used for rollback to 8.0)
# The app services and MySQL are stopped for the volume copy so the files are consistent.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: do not rewrite /data style paths
cd "$(dirname "$0")/../.."
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose up -d --wait mysql >/dev/null

echo "== row counts before the upgrade"
db/upgrade/counts.sh | tee "backups/counts-before-$STAMP.txt"

echo "== mysqldump"
docker exec marketplace-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --databases marketplace --single-transaction --routines --triggers --events 2>/dev/null' \
  > "backups/marketplace-$STAMP.sql"
ls -l "backups/marketplace-$STAMP.sql"

echo "== stop services and copy the data volume"
docker compose stop product-service user-service inventory-service mysql
docker run --rm -v marketplace_mysql-data:/data:ro alpine tar czf - -C /data . \
  > "backups/mysql-data-8.0-$STAMP.tgz"
ls -l "backups/mysql-data-8.0-$STAMP.tgz"
echo "$STAMP" > backups/LATEST
echo "Backup done: $STAMP"
