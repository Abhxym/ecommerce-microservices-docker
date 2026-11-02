#!/usr/bin/env bash
# Print the MySQL version and the row count of every marketplace table.
# Usage: db/upgrade/counts.sh [container]   (default: marketplace-mysql)
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: do not rewrite /data style paths
C="${1:-marketplace-mysql}"
docker exec "$C" sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "
  SELECT CONCAT(\"version   \", VERSION());
  SELECT CONCAT(\"users     \", COUNT(*)) FROM marketplace.users;
  SELECT CONCAT(\"products  \", COUNT(*)) FROM marketplace.products;
  SELECT CONCAT(\"inventory \", COUNT(*)) FROM marketplace.inventory;
  SELECT CONCAT(\"checksum  \", SUM(quantity)) FROM marketplace.inventory;" 2>/dev/null'
