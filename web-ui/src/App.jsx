import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, rupees } from './api.js';
import ProductCard from './components/ProductCard.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import SellerPanel from './components/SellerPanel.jsx';
import StatusBar from './components/StatusBar.jsx';
import Promos from './components/Promos.jsx';
import CategoryTiles from './components/CategoryTiles.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  // the Seller panel can be opened directly with http://localhost:8080/#seller
  const [view, setViewState] = useState(window.location.hash === '#seller' ? 'seller' : 'shop');
  const setView = (v) => {
    setViewState(v);
    window.history.replaceState(null, '', v === 'seller' ? '#seller' : window.location.pathname);
  };
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

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

  const add = (p) => {
    setCart((c) => ({ ...c, [p.id]: Math.min((c[p.id] || 0) + 1, p.stock.quantity) }));
    if (!cart[p.id]) setToast(`${p.name} added to cart`);
  };
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
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="#fff" />
              <path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M9.5 14.5q2.5 2.5 5 0" fill="none" stroke="#f25c05" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-name">Shop<b>Ease</b></span>
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
            {!search && <Promos onPick={setCategory} />}
            {!search && products.length > 0 && <CategoryTiles products={products} active={category} onPick={setCategory} />}

            {search && <div className="chips">
              {categories.map((c) => (
                <button key={c} className={`chip ${c === category ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>}

            {loading ? (
              <div className="grid">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="card skeleton" />)}</div>
            ) : shown.length === 0 ? (
              <p className="muted center">No products found for "{search}".</p>
            ) : (
              <section className="row-section">
                <div className="row-head">
                  <h2 className="section-title">
                    {search ? `Results for "${search}"` : category === 'All' ? 'All products' : category}
                  </h2>
                  {category !== 'All' && !search ? (
                    <button className="see-all" onClick={() => setCategory('All')}>show all products</button>
                  ) : (
                    <span className="muted">{shown.length} item{shown.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="grid">
                  {shown.map((p) => (
                    <ProductCard key={p.id} product={p} qty={cart[p.id] || 0} onAdd={() => add(p)} onRemove={() => remove(p)} />
                  ))}
                </div>
              </section>
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

      <Toast message={toast} onDone={clearToast} />

      <footer className="footer">
        Case Study 9: user-service (Spring Boot), product-service (Node.js), inventory-service (Flask), MySQL 8.4, served by nginx.
      </footer>
    </div>
  );
}
