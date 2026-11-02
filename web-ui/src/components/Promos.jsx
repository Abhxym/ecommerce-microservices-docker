import ProductArt from './ProductArt.jsx';
import { rupees } from '../api.js';

// Offer banners at the top of the shop. Each one filters the shop when clicked.
export default function Promos({ onPick }) {
  const promos = [
    { tone: 'green', title: 'Free delivery', text: `On every order above ${rupees(499)}`, cta: 'Shop now', category: 'All', art: ['Steel Water Bottle', 'Home'] },
    { tone: 'yellow', title: 'Light up your desk', text: 'LED lamps and home essentials', cta: 'Explore Home', category: 'Home', art: ['LED Desk Lamp', 'Home'] },
    { tone: 'pink', title: 'Ethnic and everyday wear', text: 'Kurtis and tees from local sellers', cta: 'Explore Clothing', category: 'Clothing', art: ['Printed Kurti', 'Clothing'] },
  ];
  return (
    <section className="promos">
      {promos.map((p) => (
        <button key={p.title} className={`promo promo-${p.tone}`} onClick={() => onPick(p.category)}>
          <div className="promo-text">
            <h2>{p.title}</h2>
            <p>{p.text}</p>
            <span className="promo-cta">{p.cta}</span>
          </div>
          <ProductArt name={p.art[0]} category={p.art[1]} size={110} plain />
        </button>
      ))}
    </section>
  );
}
