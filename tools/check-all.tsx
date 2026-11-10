import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Scene } from '../src/art/Scene';
import { TOTAL } from '../src/lib/timeline';

let bad = 0;
let maxBytes = 0;
const t0 = Date.now();
for (let f = 0; f < TOTAL; f += 1) {
  const svg = renderToStaticMarkup(<Scene frame={f} />);
  maxBytes = Math.max(maxBytes, svg.length);
  if (/NaN|undefined|Infinity/.test(svg)) {
    bad += 1;
    if (bad < 6) console.log('bad frame', f, (svg.match(/.{30}(NaN|undefined|Infinity).{30}/) || [''])[0]);
  }
}
console.log(`checked ${TOTAL} frames, bad=${bad}, max svg ${maxBytes} bytes, ${Date.now() - t0} ms`);
