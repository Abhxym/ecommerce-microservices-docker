import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, rupees } from './api.js';
import ProductCard from './components/ProductCard.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import SellerPanel from './components/SellerPanel.jsx';
import StatusBar from './components/StatusBar.jsx';

export default function App() {
  const [view, setView] = useState('shop');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The list endpoint has no stock, so each product is loaded from /api/products/{id},
  // where product-service adds the stock it gets from inventory-service.
  const load = useCallback(async () => {
    setError('');
    try {
      const list = await api.products();
      const full = await Promise.all(list.map((p) => api.product(p.id).catch(() => ({ ...p, stock: null }))));
      setProducts(full);
    } catch (e) {
      setError(`Cannot load products from product-service (${e.message})`);
    }
    try {
      const u = await api.users();
      setUsers(u);
      setUserId((current) => current || (u[0] ? String(u[0].id) : ''));
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const user = users.find((u) => String(u.id) === userId);
  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const shown = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      `${p.name} ${p.seller} ${p.category}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const items = products.filter((p) => cart[p.id]).map((p) => ({ product: p, qty: cart[p.id] }));
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.product.price, 0);

  const add = (p) => setCart((c) => ({ ...c, [p.id]: Math.min((c[p.id] || 0) + 1, p.stock.quantity) }));
  const remove = (p) =>
    setCart((c) => {
      const next = { ...c, [p.id]: (c[p.id] || 0) - 1 };
      if (next[p.id] <= 0) delete next[p.id];
      return next;
    });

  // Placing an order lowers the stock in inventory-service for each item.
  async function placeOrder() {
    for (const { product, qty } of items) {
      const current = await api.stock(product.id);
      if (current.quantity < qty) {
        throw new Error(`Only ${current.quantity} of ${product.name} left, please update your cart`);
      }
    }
    for (const { product, qty } of items) {
      const current = await api.stock(product.id);
      await api.setStock(product.id, current.quantity - qty);
    }
    setCart({});
    await load();
    return String(Date.now()).slice(-6);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('shop')}>
          <span className="brand-mark">m</span>
          <span className="brand-name">market<b>place</b></span>
        </div>

        <label className="deliver">
          <span className="deliver-title">Delivery in 15 minutes</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Customer">
            {users.length === 0 && <option value="">user-service unavailable</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}, {u.city || 'no city'}</option>
            ))}
          </select>
        </label>

        <div className="search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            placeholder='Search "lamp"'
            value={search}
            onChange={(e) => { setSearch(e.target.value); setView('shop'); }}
          />
        </div>

        <nav className="top-actions">
          <button className={`link-btn ${view === 'seller' ? 'active' : ''}`} onClick={() => setView(view === 'seller' ? 'shop' : 'seller')}>
            {view === 'seller' ? 'Back to shop' : 'Seller panel'}
          </button>
          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M3 4h2l2.4 11h11.2L21 7H6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="9" cy="19.5" r="1.5" fill="currentColor" /><circle cx="17" cy="19.5" r="1.5" fill="currentColor" />
            </svg>
            {count ? <span>{count} item{count > 1 ? 's' : ''}<br />{rupees(total)}</span> : <span>My Cart</span>}
          </button>
        </nav>
      </header>

      <StatusBar />

      <main className="content">
        {error && <div className="banner-error">{error}</div>}

        {view === 'seller' ? (
          <SellerPanel products={products} users={users} onChanged={load} />
        ) : (
          <>
            <section className="hero">
              <div>
                <h1>Everyday essentials, delivered fast</h1>
                <p>Clothing, home and electronics from local sellers. Free delivery above {rupees(499)}.</p>
              </div>
              <div className="hero-tiles">
                <span>Fresh stock every day</span>
                <span>Pune and Mumbai warehouses</span>
              </div>
            </section>

            <div className="chips">
              {categories.map((c) => (
                <button key={c} className={`chip ${c === category ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>

            {loading ? (
              <div className="grid">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="card skeleton" />)}</div>
            ) : shown.length === 0 ? (
              <p className="muted center">No products found.</p>
            ) : (
              <div className="grid">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} qty={cart[p.id] || 0} onAdd={() => add(p)} onRemove={() => remove(p)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {count > 0 && !cartOpen && view === 'shop' && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span>{count} item{count > 1 ? 's' : ''} | {rupees(total)}</span>
          <span>View cart &rsaquo;</span>
        </button>
      )}

      <CartDrawer
        open={cartOpen}
        items={items}
        user={user}
        onClose={() => setCartOpen(false)}
        onAdd={add}
        onRemove={remove}
        onPlaceOrder={placeOrder}
      />

      <footer className="footer">
        Case Study 9: user-service (Spring Boot), product-service (Node.js), inventory-service (Flask), MySQL 8.4, served by nginx.
      </footer>
    </div>
  );
}
