import ProductArt from './ProductArt.jsx';
import { rupees } from '../api.js';

function StockBadge({ stock }) {
  if (stock === null) return <span className="badge badge-grey">Stock unavailable</span>;
  if (!stock.inStock) return <span className="badge badge-red">Out of stock</span>;
  if (stock.quantity <= 20) return <span className="badge badge-amber">Only {stock.quantity} left</span>;
  return <span className="badge badge-green">In stock</span>;
}

export default function ProductCard({ product, qty, onAdd, onRemove }) {
  const { stock } = product;
  const canBuy = stock !== null && stock.inStock;
  const atLimit = canBuy && qty >= stock.quantity;

  return (
    <article className={`card ${canBuy ? '' : 'card-disabled'}`}>
      <div className="card-art">
        <ProductArt name={product.name} category={product.category} />
        <StockBadge stock={stock} />
      </div>
      <div className="card-meta">
        {stock && <span className="eta">{stock.warehouse} warehouse</span>}
      </div>
      <h3 className="card-title">{product.name}</h3>
      <p className="card-seller">by {product.seller}</p>
      <div className="card-foot">
        <span className="price">{rupees(product.price)}</span>
        {qty > 0 ? (
          <div className="stepper">
            <button onClick={onRemove} aria-label="Remove one">-</button>
            <span>{qty}</span>
            <button onClick={onAdd} disabled={atLimit} aria-label="Add one">+</button>
          </div>
        ) : (
          <button className="add-btn" onClick={onAdd} disabled={!canBuy}>ADD</button>
        )}
      </div>
    </article>
  );
}
