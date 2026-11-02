import { useState } from 'react';
import ProductArt from './ProductArt.jsx';
import { api, rupees } from '../api.js';

function StockRow({ product, onSaved }) {
  const [value, setValue] = useState(product.stock ? String(product.stock.quantity) : '');
  const [msg, setMsg] = useState('');

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.setStock(product.id, Number(value));
      setMsg('Saved');
      onSaved();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <tr>
      <td className="cell-product">
        <ProductArt name={product.name} category={product.category} size={40} />
        <div>
          <strong>{product.name}</strong>
          <span className="muted">{product.sku}</span>
        </div>
      </td>
      <td>{rupees(product.price)}</td>
      <td>{product.stock ? product.stock.warehouse : '-'}</td>
      <td>
        {product.stock === null ? (
          <span className="muted">inventory-service unreachable</span>
        ) : (
          <form className="stock-form" onSubmit={save}>
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Quantity" />
            <button type="submit">Update</button>
            {msg && <span className={msg === 'Saved' ? 'ok' : 'error'}>{msg}</span>}
          </form>
        )}
      </td>
    </tr>
  );
}

function AddUser({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', city: '' });
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const user = await api.createUser(form);
      setMsg({ ok: true, text: `Created user #${user.id}` });
      setForm({ name: '', email: '', city: '' });
      onCreated();
    } catch (err) {
      setMsg({ ok: false, text: `${err.status}: ${err.message}` });
    }
  }

  const field = (key, label, type = 'text') => (
    <label>
      {label}
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );

  return (
    <form className="user-form" onSubmit={submit}>
      {field('name', 'Name')}
      {field('email', 'Email', 'email')}
      {field('city', 'City')}
      <button type="submit" className="primary-btn">Add user</button>
      {msg && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}
    </form>
  );
}

export default function SellerPanel({ products, users, onChanged }) {
  return (
    <div className="seller">
      <section className="panel">
        <h2>Inventory <small>inventory-service (Flask)</small></h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Price</th><th>Warehouse</th><th>Stock</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <StockRow key={`${p.id}-${p.stock ? p.stock.quantity : 'na'}`} product={p} onSaved={onChanged} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Users <small>user-service (Spring Boot)</small></h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>City</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.city}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Add a user</h3>
        <AddUser onCreated={onChanged} />
      </section>
    </div>
  );
}
