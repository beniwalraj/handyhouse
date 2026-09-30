// Deterministic mock catalogue. Change PRODUCT_COUNT to scale the load.
export const CATEGORIES = [
  { id: 'tools', name: 'Power tools', icon: '🔧' },
  { id: 'garden', name: 'Garden', icon: '🌱' },
  { id: 'paint', name: 'Paint', icon: '🎨' },
  { id: 'timber', name: 'Timber', icon: '🪵' },
  { id: 'plumb', name: 'Plumbing', icon: '🚿' },
  { id: 'elec', name: 'Electrical', icon: '💡' },
  { id: 'storage', name: 'Storage', icon: '📦' },
  { id: 'outdoor', name: 'Outdoor', icon: '⛺' },
];
const NOUNS = ['Drill', 'Saw', 'Hose', 'Paint 4L', 'Pine 90x45', 'Tap', 'Cable 10m', 'Shelf', 'Ladder', 'Sander', 'Mower', 'Brush Set'];
const BRANDS = ['Ryobi', 'Makita', 'Dulux', 'Kincrome', 'Gardena', 'Zenith', 'Ozito', 'Stanley'];

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

export function makeProducts(count) {
  seed = 42;
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const brand = BRANDS[Math.floor(rnd() * BRANDS.length)];
    const noun = NOUNS[Math.floor(rnd() * NOUNS.length)];
    out[i] = {
      id: String(i),
      sku: 'I' + (1000000 + i),
      name: `${brand} ${noun} ${100 + (i % 900)}`,
      category: cat.id,
      icon: cat.icon,
      price: Math.round((5 + rnd() * 495) * 100) / 100,
      rating: Math.round((3 + rnd() * 2) * 10) / 10,
      reviews: Math.floor(rnd() * 900),
      stock: Math.floor(rnd() * 60),
      img: `https://picsum.photos/seed/hh${i}/300/300`,
    };
  }
  return out;
}
