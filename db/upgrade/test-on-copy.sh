#!/usr/bin/env bash
# Step 2: test the upgrade on a copy of the data, the real volume is not touched.
# Copies marketplace_mysql-data to a test volume, starts mysql:8.4 on it, checks the counts.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: do not rewrite /data style paths
cd "$(dirname "$0")/../.."
NEW_IMAGE="${1:-mysql:8.4}"
ROOT_PW=$(grep '^MYSQL_ROOT_PASSWORD=' .env | cut -d= -f2-)

docker volume rm -f mysql-upgrade-test >/dev/null 2>&1 || true
docker volume create mysql-upgrade-test >/dev/null
docker run --rm -v marketplace_mysql-data:/from:ro -v mysql-upgrade-test:/to alpine cp -a /from/. /to/
echo "== copied the data volume to mysql-upgrade-test"

docker rm -f mysql-upgrade-test >/dev/null 2>&1 || true
docker run -d --name mysql-upgrade-test -e MYSQL_ROOT_PASSWORD="$ROOT_PW" \
  -v mysql-upgrade-test:/var/lib/mysql "$NEW_IMAGE" >/dev/null
echo "== started $NEW_IMAGE on the copy, waiting for it"
for i in $(seq 1 60); do
  if docker exec mysql-upgrade-test sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' 2>/dev/null; then break; fi
  sleep 2
done
docker logs mysql-upgrade-test 2>&1 | grep -i -E "upgrad|ready for connections" | grep -v -i "x plugin" | tail -5
echo "== counts on the upgraded copy"
db/upgrade/counts.sh mysql-upgrade-test
echo "== app user can log in"
docker exec mysql-upgrade-test mysql -umarketplace -p"$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)" \
  -e "SELECT COUNT(*) AS users_seen_by_app FROM marketplace.users" 2>/dev/null

docker rm -f mysql-upgrade-test >/dev/null
docker volume rm mysql-upgrade-test >/dev/null
echo "== test container and volume removed"
