import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'fs';
import { Coralo, CoraloPose } from '../src/art/Coralo';

const base: CoraloPose = {
  phase: 0, walk: 0, turn: 0, blink: 0, mouthOpen: 0, wave: 0, wavePhase: 0,
  jump: 0, squash: 0, sprout: 0,
};
const poses: Array<[string, Partial<CoraloPose>]> = [
  ['stand', {}],
  ['wave', { wave: 1, wavePhase: 0.8, mouthOpen: 0.6 }],
  ['walk', { walk: 1, turn: 1, phase: 1.0 }],
  ['walk2', { walk: 1, turn: 1, phase: 4.2, blink: 0.8 }],
];
const cells = poses.map(([name, p], i) => (
  <g key={name} transform={`translate(${260 + i * 420} 470)`}>
    <Coralo pose={{ ...base, ...p }} />
  </g>
));
const svg = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width={1760} height={540} viewBox="0 0 1760 540">
    <rect width="1760" height="540" fill="#1b7fb0" />
    <rect y="440" width="1760" height="100" fill="#e5c586" />
    {cells}
  </svg>,
);
writeFileSync('/home/claude/preview-coralo.svg', svg);
