import ProductArt from './ProductArt.jsx';

// "Shop by category" row, one tile per category with a picture of its first product.
export default function CategoryTiles({ products, active, onPick }) {
  const categories = [...new Set(products.map((p) => p.category))];
  return (
    <section className="cat-section">
      <h2 className="section-title">Shop by category</h2>
      <div className="cat-tiles">
        {categories.map((c) => {
          const first = products.find((p) => p.category === c);
          const count = products.filter((p) => p.category === c).length;
          return (
            <button key={c} className={`cat-tile ${active === c ? 'active' : ''}`} onClick={() => onPick(active === c ? 'All' : c)}>
              <ProductArt name={first.name} category={c} size={84} />
              <strong>{c}</strong>
              <span>{count} item{count > 1 ? 's' : ''}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
