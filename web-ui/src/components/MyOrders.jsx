import { useCallback, useEffect, useState } from 'react';
import ProductArt from './ProductArt.jsx';
import { api, rupees } from '../api.js';

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function OrderCard({ order, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await onCancel(order.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <article className="order-card">
      <header className="order-head">
        <div>
          <strong>Order #{order.id}</strong>
          <span className="muted">{when(order.createdAt)}{order.deliveryCity ? `, to ${order.deliveryCity}` : ''}</span>
        </div>
        <span className={`pill pill-${order.status.toLowerCase()}`}>{order.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</span>
      </header>
      <ul className="order-items">
        {order.items.map((i) => (
          <li key={i.productId}>
            <ProductArt name={i.name} category="" size={40} />
            <span className="order-item-name">{i.name}</span>
            <span className="muted">{i.quantity} x {rupees(i.price)}</span>
            <strong>{rupees(i.lineTotal)}</strong>
          </li>
        ))}
      </ul>
      <footer className="order-foot">
        <span className="muted">
          Items {rupees(order.itemTotal)} + handling {rupees(order.handlingFee)} + delivery{' '}
          {order.deliveryFee ? rupees(order.deliveryFee) : 'free'}
        </span>
        <strong className="order-total">{rupees(order.grandTotal)}</strong>
        {order.status === 'CONFIRMED' && (
          <button className="cancel-btn" onClick={cancel} disabled={busy}>{busy ? 'Cancelling...' : 'Cancel order'}</button>
        )}
      </footer>
      {error && <p className="error">{error}</p>}
    </article>
  );
}

// Orders of the selected customer, from order-service.
export default function MyOrders({ user, onChanged, onShop }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      setOrders(await api.orders(user.id));
    } catch (e) {
      setError(`Cannot load orders from order-service (${e.message})`);
      setOrders([]);
    }
  }, [user]);

  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  async function cancel(id) {
    await api.cancelOrder(id);
    await load();
    onChanged(); // stock went back up
  }

  if (!user) return <p className="muted center">Select a customer first.</p>;

  return (
    <section className="orders">
      <div className="row-head">
        <h2 className="section-title">My orders <small className="muted">{user.name}</small></h2>
        <span className="muted">order-service (Node.js)</span>
      </div>
      {error && <div className="banner-error">{error}</div>}
      {orders === null ? (
        <div className="order-card skeleton" style={{ height: 160 }} />
      ) : orders.length === 0 ? (
        <div className="empty-orders">
          <ProductArt name="box" category="" size={96} />
          <p>No orders yet.</p>
          <button className="primary-btn" onClick={onShop}>Start shopping</button>
        </div>
      ) : (
        orders.map((o) => <OrderCard key={o.id} order={o} onCancel={cancel} />)
      )}
    </section>
  );
}
