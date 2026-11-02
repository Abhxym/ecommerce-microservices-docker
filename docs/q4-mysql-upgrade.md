# Q4: Upgrade MySQL 8.0 to 8.4 without losing data

Upgrade from MySQL 8.0.46 to 8.4.13 (the 8.4 LTS line) on the same named volume
`marketplace_mysql-data`. Performed on 2 November 2026. Scripts are in `db/upgrade/`.

## Plan

| Step | What | Script |
|---|---|---|
| 0 | Pre-checks: auth plugins, removed options | manual, see below |
| 1 | Record row counts, `mysqldump`, copy of the data volume | `db/upgrade/backup.sh` |
| 2 | Test the upgrade on a copy of the volume | `db/upgrade/test-on-copy.sh` |
| 3 | Change the image to `mysql:8.4`, start on the same volume | edit `docker-compose.yml`, `docker compose up -d` |
| 4 | Verify counts, checksum and the services | `db/upgrade/counts.sh`, `curl` |
| 5 | Rollback if needed | `db/upgrade/rollback.sh` |

## Step 0: pre-checks

MySQL 8.4 turns off `mysql_native_password` by default and removes `--default-authentication-plugin`.
Both of our users already use `caching_sha2_password`, and we pass no removed options:

```
user         host       plugin
marketplace  %          caching_sha2_password
root         %          caching_sha2_password
root         localhost  caching_sha2_password
```

## Step 1: backup

```
$ db/upgrade/backup.sh
== row counts before the upgrade
version   8.0.46
users     3
products  5
inventory 5
checksum  233
== mysqldump
backups/marketplace-20261102-120551.sql          4984 bytes
== stop services and copy the data volume
backups/mysql-data-8.0-20261102-120551.tgz    5601738 bytes
Backup done: 20261102-120551
```

- The **mysqldump** file is a logical backup that can be loaded into any MySQL version.
- The **volume copy** is the exact 8.0 data directory. It is used for rollback, because
  MySQL cannot open 8.4 data files with 8.0 (no in-place downgrade).
- `checksum` is `SUM(inventory.quantity)`, a quick check that values (not only rows) are unchanged.
- `backups/` is in `.gitignore`, backups are never committed.

## Step 2: test on a copy

The real volume is copied to `mysql-upgrade-test` and `mysql:8.4` is started on the copy:

```
$ db/upgrade/test-on-copy.sh mysql:8.4
== copied the data volume to mysql-upgrade-test
== started mysql:8.4 on the copy, waiting for it
[Server] Data dictionary upgrading from version '80023' to '80300'.
[Server] Data dictionary upgrade from version '80023' to '80300' completed.
[Server] Server upgrade from '80046' to '80413' started.
[Server] Server upgrade from '80046' to '80413' completed.
[Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.13'
== counts on the upgraded copy
version   8.4.13
users     3
products  5
inventory 5
checksum  233
== app user can log in
users_seen_by_app
3
== test container and volume removed
```

## Step 3: upgrade

In `docker-compose.yml` only the image changes. The volume stays the same:

```yaml
  mysql:
    image: mysql:8.4          # was mysql:8.0
    volumes:
      - mysql-data:/var/lib/mysql
```

```
$ docker compose up -d mysql
Container marketplace-mysql  Healthy
[Server] Server upgrade from '80046' to '80413' started.
[Server] Server upgrade from '80046' to '80413' completed.
[Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.13'
```

MySQL 8.4 upgrades the data dictionary and system tables by itself on the first start
(no `mysql_upgrade` step since 8.0.16).

## Step 4: verify

```
$ db/upgrade/counts.sh
version   8.4.13
users     3
products  5
inventory 5
checksum  233

$ docker compose up -d && docker compose ps
NAME                IMAGE                               STATUS
inventory-service   marketplace/inventory-service:1.0   Up (healthy)
marketplace-mysql   mysql:8.4                           Up (healthy)
product-service     marketplace/product-service:1.0     Up (healthy)
user-service        marketplace/user-service:1.0        Up (healthy)

$ curl localhost:8082/api/products/1
{"id":1,"sku":"TSH-001",...,"stock":{"quantity":120,"warehouse":"Pune","inStock":true}}
```

Same counts and checksum as before, and all three services read their data.

## Step 5: rollback plan (tested)

```
$ db/upgrade/rollback.sh
== volume restored from backups/mysql-data-8.0-20261102-120551.tgz
== back on MySQL 8.0
$ db/upgrade/counts.sh
version   8.0.46
users     3
products  5
inventory 5
checksum  233
```

The rollback stops the services, restores the 8.0 volume copy and sets the image back to
`mysql:8.0`. It was run once to prove it works, then the upgrade was done again
(8.4.13, same counts). If the volume copy is lost, the mysqldump file can be loaded
into a fresh 8.0 volume instead:

```bash
docker exec -i marketplace-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < backups/marketplace-<STAMP>.sql
```

## Notes

- Downtime: from stopping the services (step 1) until they are healthy on 8.4, about 2 minutes.
- Do not run `docker compose down -v`: `-v` deletes the `mysql-data` volume.
- Upgrade path: 8.0 to 8.4 is a supported direct upgrade (8.4 is the next LTS after 8.0).
