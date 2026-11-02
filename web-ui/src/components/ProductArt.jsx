import { useId } from 'react';

// Drawn pictures for the sample products, so the UI needs no image files.
// Picked by keywords in the product name, with a fallback per category.

function Shirt({ g }) {
  return (
    <g>
      <path d="M36 26 L50 18 Q60 27 70 18 L84 26 L98 42 L86 52 L80 46 L80 100 Q80 104 76 104 L44 104 Q40 104 40 100 L40 46 L34 52 L22 42 Z" fill={`url(#${g}a)`} />
      <path d="M50 18 Q60 34 70 18" fill="none" stroke="#2546b8" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 46 L40 58 M80 46 L80 58" stroke="#3058d6" strokeWidth="2" opacity="0.5" />
      <path d="M46 30 Q52 60 46 100" stroke="#fff" strokeWidth="3" opacity="0.18" fill="none" />
    </g>
  );
}

function Kurti({ g }) {
  return (
    <g>
      <path d="M44 20 L52 15 Q60 24 68 15 L76 20 L88 36 L80 43 L77 39 L86 104 L34 104 L43 39 L40 43 L32 36 Z" fill={`url(#${g}b)`} />
      <path d="M60 24 L60 46" stroke="#a52552" strokeWidth="2" />
      <path d="M36 92 L84 92" stroke="#ffd166" strokeWidth="4" opacity="0.9" />
      {[[50, 58], [68, 58], [58, 70], [48, 80], [70, 80]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.8" fill="#ffe1ea" />
      ))}
    </g>
  );
}

function Bottle({ g }) {
  return (
    <g>
      <rect x="51" y="10" width="18" height="11" rx="3" fill="#2f343c" />
      <path d="M48 26 Q48 21 53 21 L67 21 Q72 21 72 26 L77 38 L77 100 Q77 107 70 107 L50 107 Q43 107 43 100 L43 38 Z" fill={`url(#${g}c)`} />
      <rect x="43" y="52" width="34" height="26" fill="#12805c" />
      <path d="M50 32 L50 98" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function Mouse({ g }) {
  return (
    <g>
      <path d="M60 20 Q34 22 34 60 Q34 104 60 104 Q86 104 86 60 Q86 22 60 20 Z" fill={`url(#${g}d)`} />
      <path d="M60 20 L60 52 M35 52 L85 52" stroke="#4a5160" strokeWidth="2" />
      <rect x="57" y="31" width="6" height="13" rx="3" fill="#5ee0a5" />
      <path d="M44 62 Q42 84 54 96" stroke="#fff" strokeWidth="3" opacity="0.15" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Lamp({ g }) {
  return (
    <g>
      <path d="M82 54 L104 96 L70 96 Z" fill="#ffe680" opacity="0.45" />
      <rect x="34" y="96" width="46" height="9" rx="4.5" fill="#2f343c" />
      <path d="M57 96 L57 62 L74 40" stroke="#3a3f47" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="57" cy="62" r="4" fill="#3a3f47" />
      <path d="M60 26 L96 38 L84 56 Z" fill={`url(#${g}e)`} />
    </g>
  );
}

function Box() {
  return (
    <g>
      <path d="M28 44 L60 30 L92 44 L92 90 L60 104 L28 90 Z" fill="#d9a066" />
      <path d="M28 44 L60 58 L92 44 M60 58 L60 104" stroke="#b07a45" strokeWidth="3" fill="none" />
      <path d="M44 37 L76 51 L76 64" stroke="#f2d3a8" strokeWidth="5" fill="none" />
    </g>
  );
}

const pictures = { shirt: Shirt, kurti: Kurti, bottle: Bottle, mouse: Mouse, lamp: Lamp, box: Box };

const backgrounds = {
  Clothing: ['#eef3ff', '#dfe8ff'],
  Home: ['#fff8dc', '#ffefb3'],
  Electronics: ['#e8f7f0', '#d2efe2'],
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

export default function ProductArt({ name, category, size = 120, plain = false }) {
  const g = useId().replace(/:/g, '');
  const [from, to] = backgrounds[category] || ['#f4f5f7', '#e9ebef'];
  const Picture = pictures[pick(name, category)];
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={name} className="art">
      <defs>
        <linearGradient id={`${g}bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
        <linearGradient id={`${g}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6f95ff" /><stop offset="1" stopColor="#3d67f0" /></linearGradient>
        <linearGradient id={`${g}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2679a" /><stop offset="1" stopColor="#d23a6c" /></linearGradient>
        <linearGradient id={`${g}c`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d5dce3" /><stop offset="1" stopColor="#9aa6b2" /></linearGradient>
        <linearGradient id={`${g}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a5162" /><stop offset="1" stopColor="#23272f" /></linearGradient>
        <linearGradient id={`${g}e`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd84d" /><stop offset="1" stopColor="#f2b600" /></linearGradient>
      </defs>
      {!plain && <rect width="120" height="120" rx="16" fill={`url(#${g}bg)`} />}
      <ellipse cx="60" cy="108" rx="30" ry="4" fill="#000" opacity="0.08" />
      <Picture g={g} />
    </svg>
  );
}
