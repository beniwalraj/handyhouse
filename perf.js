import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

// JS-thread FPS via requestAnimationFrame. Drops here mean JS is blocked.
export function FpsMeter() {
  const [fps, setFps] = useState(60);
  const [worst, setWorst] = useState(60);
  const frames = useRef(0);
  const last = useRef(Date.now());
  useEffect(() => {
    let id;
    const tick = () => {
      frames.current++;
      const now = Date.now();
      if (now - last.current >= 1000) {
        const f = Math.round((frames.current * 1000) / (now - last.current));
        setFps(f);
        setWorst((w) => Math.min(w, f));
        frames.current = 0;
        last.current = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const color = fps >= 55 ? '#2e9e4f' : fps >= 40 ? '#e0a100' : '#d32f2f';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 50, right: 8, backgroundColor: '#000c', padding: 6, borderRadius: 6, zIndex: 99 }}>
      <Text style={{ color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>JS {fps} fps</Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>worst {worst}</Text>
    </View>
  );
}

// Simple timing log: mark('search') ... measure('search').
const marks = {};
export const log = [];
export const mark = (k) => { marks[k] = Date.now(); };
export const measure = (k) => {
  if (marks[k] == null) return;
  const ms = Date.now() - marks[k];
  log.unshift(`${k}: ${ms}ms`);
  if (log.length > 30) log.pop();
  console.log(`[perf] ${k} ${ms}ms`);
  return ms;
};
