import { useState } from 'react';
import ProductArt from './ProductArt.jsx';
import { rupees } from '../api.js';

const FREE_DELIVERY_FROM = 499;
const DELIVERY_FEE = 30;
const HANDLING_FEE = 5;

export default function CartDrawer({ open, items, user, onClose, onAdd, onRemove, onPlaceOrder }) {
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const itemTotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const delivery = itemTotal >= FREE_DELIVERY_FROM || itemTotal === 0 ? 0 : DELIVERY_FEE;
  const total = itemTotal + (itemTotal ? HANDLING_FEE : 0) + delivery;

  async function place() {
    setPlacing(true);
    setError('');
    try {
      const id = await onPlaceOrder();
      setOrder({ id, total, count: items.reduce((s, i) => s + i.qty, 0) });
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  }

  function close() {
    setOrder(null);
    setError('');
    onClose();
  }

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={close} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <header className="drawer-head">
          <h2>{order ? 'Order placed' : 'My cart'}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close cart">&times;</button>
        </header>

        {order ? (
          <div className="order-done">
            <div className="tick">&#10003;</div>
            <h3>Thank you{user ? `, ${user.name.split(' ')[0]}` : ''}!</h3>
            <p>Order <strong>#{order.id}</strong> with {order.count} item(s), total {rupees(order.total)}.</p>
            <p className="muted">Stock was reduced in inventory-service. Check the Seller panel.</p>
            <button className="primary-btn" onClick={close}>Continue shopping</button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-cart">
            <ProductArt name="box" category="" size={96} />
            <p>Your cart is empty</p>
            <button className="primary-btn" onClick={close}>Start shopping</button>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              {itemTotal < FREE_DELIVERY_FROM && (
                <div className="hint">Add {rupees(FREE_DELIVERY_FROM - itemTotal)} more for free delivery</div>
              )}
              <ul className="cart-list">
                {items.map(({ product, qty }) => (
                  <li key={product.id}>
                    <ProductArt name={product.name} category={product.category} size={56} />
                    <div className="cart-info">
                      <span className="cart-name">{product.name}</span>
                      <span className="muted">{rupees(product.price)}</span>
                    </div>
                    <div className="stepper small">
                      <button onClick={() => onRemove(product)}>-</button>
                      <span>{qty}</span>
                      <button onClick={() => onAdd(product)} disabled={qty >= product.stock.quantity}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
              <section className="bill">
                <h4>Bill details</h4>
                <div><span>Item total</span><span>{rupees(itemTotal)}</span></div>
                <div><span>Handling charge</span><span>{rupees(HANDLING_FEE)}</span></div>
                <div><span>Delivery fee</span><span>{delivery ? rupees(delivery) : <em className="free">FREE</em>}</span></div>
                <div className="bill-total"><span>Grand total</span><span>{rupees(total)}</span></div>
              </section>
              {user && (
                <section className="deliver-to">
                  <h4>Delivering to</h4>
                  <p>{user.name}, {user.city || 'no city'}</p>
                </section>
              )}
              {error && <p className="error">{error}</p>}
            </div>
            <footer className="drawer-foot">
              <button className="checkout-btn" onClick={place} disabled={placing || !user}>
                <span>{rupees(total)}<small>TOTAL</small></span>
                <span>{placing ? 'Placing...' : user ? 'Place order' : 'Select a user first'}</span>
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
