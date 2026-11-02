import logging
import os

from flask import Flask, jsonify, request

import db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("inventory-service")


def to_json(row):
    return {
        "productId": row["product_id"],
        "quantity": row["quantity"],
        "warehouse": row["warehouse"],
        "inStock": row["quantity"] > 0,
    }


# store is passed in so the tests can use a fake one
def create_app(store=db):
    app = Flask(__name__)

    @app.get("/health")
    def health():
        try:
            store.ping()
            return jsonify(status="UP")
        except Exception as e:
            log.error("health check failed: %s", e)
            return jsonify(status="DOWN"), 503

    @app.get("/api/inventory/<int:product_id>")
    def get_stock(product_id):
        row = store.find(product_id)
        if row is None:
            return jsonify(error="Product not found"), 404
        return jsonify(to_json(row))

    @app.put("/api/inventory/<int:product_id>")
    def update_stock(product_id):
        body = request.get_json(silent=True) or {}
        quantity = body.get("quantity")
        # bool is a subclass of int in Python, so reject it explicitly
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 0:
            return jsonify(error="quantity must be a whole number, 0 or more"), 400
        row = store.update_quantity(product_id, quantity)
        if row is None:
            return jsonify(error="Product not found"), 404
        log.info("stock for product %s set to %s", product_id, quantity)
        return jsonify(to_json(row))

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(Exception)
    def server_error(e):
        log.exception("request failed")
        return jsonify(error="Internal server error"), 500

    return app


app = create_app()

if __name__ == "__main__":
    # 0.0.0.0 so other containers can reach it. With 127.0.0.1 only this container could.
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8083")))
