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


def reserve(product_id, quantity):
    """Take quantity out of stock in one statement, so two orders cannot take the same units.
    Returns (row, ok). ok is False when there is not enough stock, row is None for an unknown product."""
    with connect() as conn, conn.cursor() as cur:
        changed = cur.execute(
            "UPDATE inventory SET quantity = quantity - %s WHERE product_id = %s AND quantity >= %s",
            (quantity, product_id, quantity),
        )
        cur.execute(
            "SELECT product_id, quantity, warehouse FROM inventory WHERE product_id = %s",
            (product_id,),
        )
        return cur.fetchone(), changed == 1


def release(product_id, quantity):
    """Put quantity back into stock (order cancelled or failed)."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE inventory SET quantity = quantity + %s WHERE product_id = %s",
            (quantity, product_id),
        )
        cur.execute(
            "SELECT product_id, quantity, warehouse FROM inventory WHERE product_id = %s",
            (product_id,),
        )
        return cur.fetchone()
