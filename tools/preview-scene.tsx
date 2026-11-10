import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'fs';
import { Scene } from '../src/art/Scene';

const frames = (process.env.FRAMES || '0,60,240,420,560,620,680,715').split(',').map(Number);
mkdirSync('/home/claude/frames', { recursive: true });
for (const f of frames) {
  const t0 = Date.now();
  const svg = renderToStaticMarkup(<Scene frame={f} />);
  writeFileSync(`/home/claude/frames/f${String(f).padStart(4, '0')}.svg`, svg);
  console.log('frame', f, 'svg bytes', svg.length, 'ms', Date.now() - t0);
}
