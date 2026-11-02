import pytest

from app import create_app


class FakeStore:
    def __init__(self):
        self.rows = {1: {"product_id": 1, "quantity": 120, "warehouse": "Pune"},
                     3: {"product_id": 3, "quantity": 0, "warehouse": "Mumbai"}}
        self.up = True

    def ping(self):
        if not self.up:
            raise ConnectionError("database down")

    def find(self, product_id):
        return self.rows.get(product_id)

    def update_quantity(self, product_id, quantity):
        if product_id not in self.rows:
            return None
        self.rows[product_id]["quantity"] = quantity
        return self.rows[product_id]

    def reserve(self, product_id, quantity):
        row = self.rows.get(product_id)
        if row is None:
            return None, False
        if row["quantity"] < quantity:
            return row, False
        row["quantity"] -= quantity
        return row, True

    def release(self, product_id, quantity):
        row = self.rows.get(product_id)
        if row is None:
            return None
        row["quantity"] += quantity
        return row


@pytest.fixture
def store():
    return FakeStore()


@pytest.fixture
def client(store):
    return create_app(store).test_client()


def test_health_up(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "UP"}


def test_health_down(client, store):
    store.up = False
    assert client.get("/health").status_code == 503


def test_get_stock(client):
    res = client.get("/api/inventory/1")
    assert res.status_code == 200
    assert res.get_json() == {"productId": 1, "quantity": 120, "warehouse": "Pune", "inStock": True}


def test_out_of_stock(client):
    assert client.get("/api/inventory/3").get_json()["inStock"] is False


def test_unknown_product_is_404(client):
    assert client.get("/api/inventory/99").status_code == 404


def test_update_stock(client):
    res = client.put("/api/inventory/1", json={"quantity": 50})
    assert res.status_code == 200
    assert res.get_json()["quantity"] == 50


@pytest.mark.parametrize("body", [{"quantity": -1}, {"quantity": "5"}, {"quantity": True}, {}])
def test_invalid_quantity_is_400(client, body):
    assert client.put("/api/inventory/1", json=body).status_code == 400


def test_update_unknown_product_is_404(client):
    assert client.put("/api/inventory/99", json={"quantity": 5}).status_code == 404


def test_reserve_takes_stock(client):
    res = client.post("/api/inventory/1/reserve", json={"quantity": 20})
    assert res.status_code == 200
    assert res.get_json()["quantity"] == 100


def test_reserve_more_than_stock_is_409(client, store):
    res = client.post("/api/inventory/1/reserve", json={"quantity": 121})
    assert res.status_code == 409
    assert res.get_json()["available"] == 120
    assert store.rows[1]["quantity"] == 120


def test_reserve_unknown_product_is_404(client):
    assert client.post("/api/inventory/99/reserve", json={"quantity": 1}).status_code == 404


@pytest.mark.parametrize("body", [{"quantity": 0}, {"quantity": -2}, {"quantity": "1"}, {}])
def test_reserve_invalid_quantity_is_400(client, body):
    assert client.post("/api/inventory/1/reserve", json=body).status_code == 400


def test_release_gives_stock_back(client):
    client.post("/api/inventory/1/reserve", json={"quantity": 5})
    res = client.post("/api/inventory/1/release", json={"quantity": 5})
    assert res.status_code == 200
    assert res.get_json()["quantity"] == 120
