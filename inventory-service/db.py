import os

import pymysql


def connect():
    # one short connection per request, settings from environment variables (see .env.example)
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "marketplace"),
        user=os.getenv("DB_USER", "marketplace"),
        password=os.getenv("DB_PASSWORD", ""),
        connect_timeout=3,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def ping():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")


def find(product_id):
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT product_id, quantity, warehouse FROM inventory WHERE product_id = %s",
            (product_id,),
        )
        return cur.fetchone()


def update_quantity(product_id, quantity):
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE inventory SET quantity = %s WHERE product_id = %s",
            (quantity, product_id),
        )
        cur.execute(
            "SELECT product_id, quantity, warehouse FROM inventory WHERE product_id = %s",
            (product_id,),
        )
        return cur.fetchone()
