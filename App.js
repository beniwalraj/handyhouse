import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, Image, ScrollView, Switch,
  StyleSheet, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { CATEGORIES, makeProducts } from './data';
import { FpsMeter, mark, measure, log } from './perf';

const C = { green: '#0d5c3a', red: '#c8281e', bg: '#f4f2ee', ink: '#1b1b1b', mute: '#6b6b6b', line: '#e2ded6' };
const money = (n) => '$' + n.toFixed(2);
const COUNTS = [1000, 5000, 20000];

/* ---------- product card (memoised: main re-render hotspot) ---------- */
const ProductCard = memo(function ProductCard({ item, onOpen, onAdd, remote }) {
return (
  <Pressable style={s.card} onPress={() => onOpen(item)} accessible={false}>
    <View style={s.thumb}>
      {remote ? <Image source={{ uri: item.img }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 40 }}>{item.icon}</Text>}
    </View>
    <Text numberOfLines={2} style={s.name}>{item.name}</Text>
    <Text style={s.mute}>★ {item.rating} ({item.reviews})</Text>
    <Text style={s.price}>{money(item.price)}</Text>
    <Pressable
      style={s.btn}
      onPress={() => onAdd(item)}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Add to cart"
      testID={`add-to-cart-${item.id}`}
    >
      <Text style={s.btnT}>Add to cart</Text>
    </Pressable>
  </Pressable>
);
});

export default function App() {
  const [count, setCount] = useState(20000);
  const [remote, setRemote] = useState(false);
  const [showFps, setShowFps] = useState(true);
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState(null);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [cart, setCart] = useState({});
  const listRef = useRef(null);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(null);

  const products = useMemo(() => { mark('gen'); const p = makeProducts(count); measure('gen ' + count); return p; }, [count]);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const results = useMemo(() => {
    mark('filter');
    const q = query.trim().toLowerCase();
    const r = products.filter((p) => (!cat || p.category === cat) && (!q || p.name.toLowerCase().includes(q)));
    measure('filter');
    return r;
  }, [products, cat, query]);

  const add = useCallback((p) => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 })), []);
  const open = useCallback((p) => { mark('detail'); setDetail(p); requestAnimationFrame(() => measure('detail')); }, []);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((a, [id, q]) => a + (byId[id]?.price || 0) * q, 0);

  const toggleAuto = () => {
    if (auto) { clearInterval(autoRef.current); setAuto(false); return; }
    let y = 0, dir = 1;
    setAuto(true);
    autoRef.current = setInterval(() => {
      y += dir * 1800; if (y < 0) { y = 0; dir = 1; }
      listRef.current?.scrollToOffset({ offset: y, animated: false });
      if (Math.random() < 0.02) dir *= -1;
    }, 50);
  };
  const spamCart = () => { mark('spam'); for (let i = 0; i < 200; i++) add(products[i % products.length]); measure('spam'); };

  const renderItem = useCallback(({ item }) => <ProductCard item={item} onOpen={open} onAdd={add} remote={remote} />, [open, add, remote]);
  const keyExtractor = useCallback((p) => p.id, []);

  /* ---------- screens ---------- */
  const Home = (
    <ScrollView>
      <View style={s.hero}><Text style={s.heroH}>Fix it. Build it. Grow it.</Text><Text style={{ color: '#fff' }}>Trade prices on {count.toLocaleString()} products</Text></View>
      <Text style={s.h2}>Shop by category</Text>
      <View style={s.grid}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.id} style={s.cat} onPress={() => { setCat(c.id); setTab('shop'); }}>
            <Text style={{ fontSize: 30 }}>{c.icon}</Text><Text style={s.catT}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.h2}>Popular right now</Text>
      <FlatList horizontal data={products.slice(0, 12)} keyExtractor={keyExtractor} renderItem={renderItem} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }} />
    </ScrollView>
  );

  const Shop = (
    <View style={{ flex: 1 }}>
      <TextInput style={s.search} placeholder="Search products" value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {[{ id: null, name: 'All' }, ...CATEGORIES].map((c) => (
          <Pressable key={String(c.id)} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && { backgroundColor: C.green }]}>
            <Text style={{ color: cat === c.id ? '#fff' : C.ink }}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[s.mute, { padding: 10 }]}>{results.length.toLocaleString()} results</Text>
      <FlatList
        ref={listRef} data={results} numColumns={2} keyExtractor={keyExtractor} renderItem={renderItem}
        initialNumToRender={8} maxToRenderPerBatch={10} windowSize={7} removeClippedSubviews
        columnWrapperStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  );

  const Cart = (
    <View style={{ flex: 1 }}>
      <FlatList
        data={Object.keys(cart)} keyExtractor={(k) => k}
        ListEmptyComponent={<Text style={[s.mute, { padding: 20 }]}>Your cart is empty. Add something from Shop.</Text>}
        renderItem={({ item: id }) => (
          <View style={s.row}><Text style={{ flex: 1 }}>{byId[id]?.name}</Text><Text>× {cart[id]}</Text><Text style={{ width: 80, textAlign: 'right' }}>{money(byId[id].price * cart[id])}</Text></View>
        )}
      />
      <View style={s.total}><Text style={s.h2}>Total {money(cartTotal)}</Text></View>
    </View>
  );

  const Perf = (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <Text style={s.h2}>Catalogue size</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {COUNTS.map((n) => (
          <Pressable key={n} onPress={() => setCount(n)} style={[s.chip, count === n && { backgroundColor: C.green }]}><Text style={{ color: count === n ? '#fff' : C.ink }}>{n.toLocaleString()}</Text></Pressable>
        ))}
      </View>
      <View style={s.sw}><Text>Remote images (network + decode load)</Text><Switch value={remote} onValueChange={setRemote} /></View>
      <View style={s.sw}><Text>Show FPS overlay</Text><Switch value={showFps} onValueChange={setShowFps} /></View>
      <Pressable style={s.btnBig} onPress={() => { setCat(null); setQuery(''); setTab('shop'); toggleAuto(); }}><Text style={s.btnT}>{auto ? 'Stop auto-scroll' : 'Start auto-scroll on Shop'}</Text></Pressable>
      <Pressable style={[s.btnBig, { backgroundColor: C.red }]} onPress={spamCart}><Text style={s.btnT}>Add 200 items to cart</Text></Pressable>
      <Text style={s.h2}>Timings</Text>
      {log.map((l, i) => <Text key={i} style={{ fontVariant: ['tabular-nums'] }}>{l}</Text>)}
      <Text style={s.mute}>Reopen this tab to refresh the log. Also see console "[perf]" lines.</Text>
    </ScrollView>
  );

  const screens = { home: Home, shop: Shop, cart: Cart, perf: Perf };
  return (
    <SafeAreaView style={s.root}>
      <ExpoStatusBar style="light" />
      <View style={s.header}><Text style={s.logo}>Handyhouse</Text></View>
      {showFps && <FpsMeter />}
      <View style={{ flex: 1 }}>{screens[tab]}</View>

      {detail && (
        <View style={s.modal}>
          <Pressable onPress={() => setDetail(null)} style={{ padding: 14 }}><Text style={{ color: C.green, fontWeight: '700' }}>‹ Back</Text></Pressable>
          <View style={[s.thumb, { height: 240, marginHorizontal: 14 }]}>{remote ? <Image source={{ uri: detail.img }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 90 }}>{detail.icon}</Text>}</View>
          <View style={{ padding: 14 }}>
            <Text style={s.h2}>{detail.name}</Text>
            <Text style={s.mute}>SKU {detail.sku} · {detail.stock > 0 ? `${detail.stock} in stock` : 'Out of stock'}</Text>
            <Text style={[s.price, { fontSize: 26 }]}>{money(detail.price)}</Text>
            <Pressable style={s.btnBig} onPress={() => add(detail)}><Text style={s.btnT}>Add to cart</Text></Pressable>
          </View>
        </View>
      )}

      <View style={s.tabs}>
        {[['home', 'Home'], ['shop', 'Shop'], ['cart', `Cart (${cartCount})`], ['perf', 'Perf']].map(([k, l]) => (
          <Pressable key={k} style={s.tab} onPress={() => { setDetail(null); setTab(k); }}><Text style={{ fontWeight: tab === k ? '800' : '400', color: tab === k ? C.green : C.mute }}>{l}</Text></Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { backgroundColor: C.green, padding: 14 }, logo: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hero: { backgroundColor: C.red, margin: 10, padding: 20, borderRadius: 10 }, heroH: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: '800', padding: 10, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6 },
  cat: { width: '25%', alignItems: 'center', paddingVertical: 12 }, catT: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  card: { flex: 1, backgroundColor: '#fff', margin: 4, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.line, minWidth: 160, maxWidth: 200 },
  thumb: { height: 110, backgroundColor: '#ece8df', borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 },
  name: { fontWeight: '600', minHeight: 36 }, mute: { color: C.mute, fontSize: 12 }, price: { fontSize: 18, fontWeight: '800', color: C.red, marginVertical: 4 },
  btn: { backgroundColor: C.green, borderRadius: 6, paddingVertical: 8, alignItems: 'center' }, btnT: { color: '#fff', fontWeight: '700' },
  btnBig: { backgroundColor: C.green, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  search: { backgroundColor: '#fff', margin: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.line },
  chip: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: C.line, alignSelf: 'center' },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: C.line, gap: 8, backgroundColor: '#fff' },
  total: { borderTopWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  sw: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: '#fff' }, tab: { flex: 1, alignItems: 'center', padding: 14 },
  modal: { position: 'absolute', top: 56, bottom: 48, left: 0, right: 0, backgroundColor: C.bg, zIndex: 50 },
});
