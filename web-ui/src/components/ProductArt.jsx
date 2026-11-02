// Simple drawn pictures for the sample products, so the UI needs no image files.
// Picked by keywords in the product name, with a fallback per category.

const art = {
  shirt: (
    <g>
      <path d="M38 22 L50 16 Q60 24 70 16 L82 22 L94 36 L84 46 L78 40 L78 98 L42 98 L42 40 L36 46 L26 36 Z" fill="#4f7cff" />
      <path d="M50 16 Q60 30 70 16" fill="none" stroke="#2c56d6" strokeWidth="3" />
    </g>
  ),
  kurti: (
    <g>
      <path d="M44 18 L52 14 Q60 22 68 14 L76 18 L86 34 L78 40 L76 36 L84 100 L36 100 L44 36 L42 40 L34 34 Z" fill="#e5487a" />
      <circle cx="52" cy="56" r="3" fill="#ffd2e0" /><circle cx="66" cy="66" r="3" fill="#ffd2e0" />
      <circle cx="54" cy="80" r="3" fill="#ffd2e0" /><circle cx="68" cy="88" r="3" fill="#ffd2e0" />
      <path d="M60 22 L60 40" stroke="#b8305b" strokeWidth="2" />
    </g>
  ),
  bottle: (
    <g>
      <rect x="51" y="10" width="18" height="10" rx="3" fill="#3a3f47" />
      <path d="M48 24 Q48 20 52 20 L68 20 Q72 20 72 24 L76 36 L76 100 Q76 106 70 106 L50 106 Q44 106 44 100 L44 36 Z" fill="#b8c2cc" />
      <rect x="44" y="50" width="32" height="26" fill="#12805c" />
      <path d="M50 30 L50 96" stroke="#e8edf2" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  mouse: (
    <g>
      <path d="M60 22 Q36 24 36 60 Q36 102 60 102 Q84 102 84 60 Q84 24 60 22 Z" fill="#2f3440" />
      <path d="M60 22 L60 52 M36 52 L84 52" stroke="#555c6b" strokeWidth="2" />
      <rect x="57" y="32" width="6" height="12" rx="3" fill="#7ee0b0" />
    </g>
  ),
  lamp: (
    <g>
      <rect x="36" y="96" width="44" height="8" rx="4" fill="#3a3f47" />
      <path d="M58 96 L58 62 L74 40" stroke="#3a3f47" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M62 26 L94 38 L84 54 Z" fill="#f7c600" />
      <path d="M84 54 L96 76" stroke="#ffe680" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  box: (
    <g>
      <path d="M30 44 L60 30 L90 44 L90 88 L60 102 L30 88 Z" fill="#d9a066" />
      <path d="M30 44 L60 58 L90 44 M60 58 L60 102" stroke="#b07a45" strokeWidth="3" fill="none" />
    </g>
  ),
};

const backgrounds = {
  Clothing: '#eef3ff',
  Home: '#fff6d6',
  Electronics: '#e9f7f0',
};

function pick(name, category) {
  const n = name.toLowerCase();
  if (n.includes('kurti')) return 'kurti';
  if (n.includes('shirt')) return 'shirt';
  if (n.includes('bottle')) return 'bottle';
  if (n.includes('mouse')) return 'mouse';
  if (n.includes('lamp')) return 'lamp';
  if (category === 'Clothing') return 'shirt';
  return 'box';
}

export default function ProductArt({ name, category, size = 120 }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={name}
         style={{ background: backgrounds[category] || '#f2f4f7', borderRadius: 12 }}>
      {art[pick(name, category)]}
    </svg>
  );
}
