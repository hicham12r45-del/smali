import React from 'react';
import { CAM_MAX, GROUND_Y, H, W } from '../lib/timeline';
import { deg, makeRandom, mod, n, pick } from '../lib/math';
import { FONT } from './palette';

// =====================================================================
// Helpers
// =====================================================================
/** Screen X of a layer item. `p` is the parallax factor of the layer. */
const sx = (x: number, cam: number, p: number): number => x - cam * p;
const visible = (x: number, pad = 400): boolean => x > -pad && x < W + pad;
const layerWidth = (p: number): number => CAM_MAX * p + W + 800;

const Blade = ({
  x, y, h, w, color, frame, seed, amp = 16,
}: {
  x: number; y: number; h: number; w: number; color: string;
  frame: number; seed: number; amp?: number;
}) => {
  const t = frame * 0.045 + seed;
  const s1 = Math.sin(t) * amp;
  const s2 = Math.sin(t * 1.3 + 1) * amp * 1.7;
  return (
    <path
      d={`M${n(x)} ${n(y)} Q${n(x + s1)} ${n(y - h * 0.5)} ${n(x + s2)} ${n(y - h)}`}
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      fill="none"
    />
  );
};

const branchPath = (
  rand: () => number, x: number, y: number, len: number, ang: number, depth: number,
): string => {
  const x2 = x + Math.sin(ang) * len;
  const y2 = y - Math.cos(ang) * len;
  let d = `M${n(x)} ${n(y)} L${n(x2)} ${n(y2)} `;
  if (depth > 0) {
    d += branchPath(rand, x2, y2, len * 0.74, ang - 0.45 - rand() * 0.35, depth - 1);
    d += branchPath(rand, x2, y2, len * 0.74, ang + 0.45 + rand() * 0.35, depth - 1);
  }
  return d;
};

// =====================================================================
// Static layer data (deterministic)
// =====================================================================
type Hill = { x: number; w: number; h: number };
const FAR_P = 0.12;
const farHills: Hill[] = (() => {
  const r = makeRandom(5);
  const list: Hill[] = [];
  for (let x = -200; x < layerWidth(FAR_P); x += 260 + r() * 260) {
    list.push({ x, w: 420 + r() * 520, h: 120 + r() * 230 });
  }
  return list;
})();

type Tower = { x: number; w: number; h: number; color: string };
const MIDFAR_P = 0.3;
const towers: Tower[] = (() => {
  const r = makeRandom(8);
  const list: Tower[] = [];
  for (let x = 0; x < layerWidth(MIDFAR_P); x += 230 + r() * 340) {
    list.push({
      x,
      w: 70 + r() * 90,
      h: 170 + r() * 330,
      color: pick(r, ['#2A8FB8', '#2B83B0', '#3092B4']),
    });
  }
  return list;
})();

type Coral = { x: number; d: string; color: string; w: number; sway: number };
const MID_P = 0.55;
const corals: Coral[] = (() => {
  const r = makeRandom(21);
  const list: Coral[] = [];
  for (let x = 40; x < layerWidth(MID_P); x += 150 + r() * 260) {
    list.push({
      x,
      d: branchPath(r, 0, 0, 52 + r() * 34, (r() - 0.5) * 0.3, 3),
      color: pick(r, ['#FF7FA3', '#C46BE0', '#FF9A5A', '#F7607C']),
      w: 7 + r() * 4,
      sway: r() * 6,
    });
  }
  return list;
})();

type Tuft = { x: number; h: number; seed: number; color: string };
const midTufts: Tuft[] = (() => {
  const r = makeRandom(33);
  const list: Tuft[] = [];
  for (let x = 0; x < layerWidth(MID_P); x += 70 + r() * 190) {
    list.push({
      x,
      h: 120 + r() * 230,
      seed: r() * 10,
      color: pick(r, ['#1FA36B', '#2BB673', '#17905F']),
    });
  }
  return list;
})();

type Prop = { x: number; y: number; kind: number; s: number; rot: number };
const GROUND_P = 1;
const groundProps: Prop[] = (() => {
  const r = makeRandom(52);
  const list: Prop[] = [];
  for (let x = 100; x < layerWidth(GROUND_P) - 800; x += 90 + r() * 230) {
    list.push({
      x,
      y: GROUND_Y - 20 + r() * 190,
      kind: Math.floor(r() * 5),
      s: 0.6 + r() * 0.8,
      rot: (r() - 0.5) * 50,
    });
  }
  return list;
})();

type Bubble = { x: number; y: number; v: number; r: number; wob: number; ph: number };
const BUBBLE_P = 0.6;
const bubbles: Bubble[] = (() => {
  const r = makeRandom(77);
  return Array.from({ length: 70 }, () => ({
    x: r() * layerWidth(BUBBLE_P),
    y: r() * (H + 160),
    v: 0.7 + r() * 2.1,
    r: 3 + r() * 11,
    wob: 6 + r() * 20,
    ph: r() * 6.28,
  }));
})();

type Dust = { x: number; y: number; v: number; r: number };
const DUST_P = 0.35;
const dust: Dust[] = (() => {
  const r = makeRandom(91);
  return Array.from({ length: 90 }, () => ({
    x: r() * layerWidth(DUST_P),
    y: r() * H,
    v: 0.1 + r() * 0.45,
    r: 1 + r() * 2.2,
  }));
})();

// =====================================================================
// Layers
// =====================================================================
export const Water = ({ frame }: { frame: number }) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const x0 = 80 + i * 260 + 46 * Math.sin(frame * 0.011 + i * 1.7);
    const w = 70 + (i % 3) * 34;
    const lean = 330 + 40 * Math.sin(frame * 0.013 + i);
    const o = 0.55 + 0.35 * Math.sin(frame * 0.02 + i * 2.1);
    return (
      <polygon
        key={i}
        points={`${n(x0)},0 ${n(x0 + w)},0 ${n(x0 + w - lean)},${H} ${n(x0 - lean)},${H}`}
        fill="url(#ray)"
        opacity={n(o)}
      />
    );
  });
  return (
    <g>
      <defs>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#59D6E8" />
          <stop offset="0.32" stopColor="#1FA0CC" />
          <stop offset="0.68" stopColor="#0F72A8" />
          <stop offset="1" stopColor="#08467C" />
        </linearGradient>
        <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.30" />
          <stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#water)" />
      {rays}
    </g>
  );
};

export const FarLayers = ({ cam }: { cam: number }) => (
  <g>
    {farHills.map((h, i) => {
      const x = sx(h.x, cam, FAR_P);
      if (!visible(x, h.w)) return null;
      return (
        <path
          key={i}
          d={`M${n(x)} 800 Q${n(x + h.w / 2)} ${n(800 - h.h * 1.6)} ${n(x + h.w)} 800 Z`}
          fill="#1C86B6"
          opacity={0.5}
        />
      );
    })}
    {towers.map((t, i) => {
      const x = sx(t.x, cam, MIDFAR_P);
      if (!visible(x, 200)) return null;
      const top = 820 - t.h;
      return (
        <g key={i} opacity={0.62}>
          <rect x={n(x)} y={n(top)} width={n(t.w)} height={n(t.h + 80)} rx={t.w / 2} fill={t.color} />
          <circle cx={n(x + t.w * 0.3)} cy={n(top + 40)} r={9} fill="#FFFFFF" opacity={0.18} />
          <circle cx={n(x + t.w * 0.65)} cy={n(top + 90)} r={6} fill="#FFFFFF" opacity={0.15} />
        </g>
      );
    })}
  </g>
);

export const MidLayer = ({ cam, frame }: { cam: number; frame: number }) => (
  <g>
    {midTufts.map((t, i) => {
      const x = sx(t.x, cam, MID_P);
      if (!visible(x, 120)) return null;
      return (
        <g key={`t${i}`} opacity={0.9}>
          <Blade x={x - 10} y={860} h={t.h} w={12} color={t.color} frame={frame} seed={t.seed} />
          <Blade x={x + 4} y={862} h={t.h * 0.8} w={11} color={t.color} frame={frame} seed={t.seed + 2} />
          <Blade x={x + 18} y={860} h={t.h * 0.6} w={10} color={t.color} frame={frame} seed={t.seed + 4} />
        </g>
      );
    })}
    {corals.map((c, i) => {
      const x = sx(c.x, cam, MID_P);
      if (!visible(x, 160)) return null;
      const sway = Math.sin(frame * 0.04 + c.sway) * 1.6;
      return (
        <g key={`c${i}`} transform={`translate(${n(x)} 862) rotate(${n(sway)})`} opacity={0.95}>
          <path d={c.d} stroke={c.color} strokeWidth={c.w} strokeLinecap="round" fill="none" />
          <ellipse cx={0} cy={4} rx={26} ry={8} fill="#0A4A6E" opacity={0.35} />
        </g>
      );
    })}
  </g>
);

export const Sand = ({ cam }: { cam: number }) => {
  const x0 = -cam;
  const waves: React.ReactNode[] = [];
  for (let i = 0; i < 40; i += 1) {
    const x = mod(i * 330 - cam, 13200) - 400;
    if (x > W + 300) continue;
    const y = 930 + (i % 5) * 36;
    waves.push(
      <path
        key={i}
        d={`M${n(x)} ${y} q60 -16 120 0 t120 0`}
        stroke="#FFF3CF"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        opacity={0.35}
      />,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2D694" />
          <stop offset="1" stopColor="#CFA55A" />
        </linearGradient>
      </defs>
      <path
        d={`M-50 ${GROUND_Y - 26} Q${n(300 + (x0 % 400))} ${GROUND_Y - 52} ${n(700)} ${GROUND_Y - 30} T1500 ${GROUND_Y - 34} T2200 ${GROUND_Y - 28} L2200 ${H + 20} L-50 ${H + 20} Z`}
        fill="url(#sand)"
      />
      <rect x={-50} y={GROUND_Y - 34} width={W + 100} height={10} fill="#FFF1C6" opacity={0.35} />
      {waves}
    </g>
  );
};

const GroundProp = ({ p, x }: { p: Prop; x: number }) => {
  const t = `translate(${n(x)} ${n(p.y)}) rotate(${n(p.rot)}) scale(${n(p.s)})`;
  switch (p.kind) {
    case 0: // starfish
      return (
        <g transform={t}>
          <polygon
            points={Array.from({ length: 10 }, (_, i) => {
              const r = i % 2 === 0 ? 24 : 10;
              const a = deg(i * 36 - 90);
              return `${n(Math.cos(a) * r)},${n(Math.sin(a) * r)}`;
            }).join(' ')}
            fill="#FF8C5A"
            stroke="#D9602F"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <circle r={3} fill="#FFD2B0" />
        </g>
      );
    case 1: // spiral shell
      return (
        <g transform={t}>
          <ellipse cx={0} cy={4} rx={20} ry={14} fill="#FFD6E3" stroke="#E58DAA" strokeWidth={3} />
          <path d="M-8 4 Q0 -8 8 4 Q0 12 -4 4" stroke="#E58DAA" strokeWidth={3} fill="none" />
        </g>
      );
    case 2: // pebbles
      return (
        <g transform={t}>
          <ellipse cx={-14} cy={4} rx={13} ry={8} fill="#B7A27B" />
          <ellipse cx={8} cy={2} rx={17} ry={10} fill="#C9B58C" />
          <ellipse cx={26} cy={6} rx={9} ry={6} fill="#A38F69" />
        </g>
      );
    case 3: // sea grass
      return (
        <g transform={t} stroke="#2FA36B" strokeWidth={6} strokeLinecap="round" fill="none">
          <path d="M-10 6 Q-18 -18 -14 -40" />
          <path d="M0 6 Q2 -22 8 -52" />
          <path d="M10 6 Q18 -14 22 -34" />
        </g>
      );
    default: // small purple coral fan
      return (
        <g transform={t}>
          <path d="M0 8 L0 -10 M0 -10 L-14 -30 M0 -10 L0 -34 M0 -10 L14 -30" stroke="#B66BE0" strokeWidth={6} strokeLinecap="round" fill="none" />
        </g>
      );
  }
};

export const GroundProps = ({ cam }: { cam: number }) => (
  <g>
    {groundProps.map((p, i) => {
      const x = sx(p.x, cam, GROUND_P);
      if (!visible(x, 120)) return null;
      return <GroundProp key={i} p={p} x={x} />;
    })}
  </g>
);

/** Wooden direction sign that points the way home. */
export const SignPost = ({ x, frame }: { x: number; frame: number }) => (
  <g transform={`translate(${n(x)} ${GROUND_Y + 40})`}>
    <ellipse cx={0} cy={6} rx={46} ry={10} fill="#8A6A2F" opacity={0.35} />
    <rect x={-8} y={-230} width={16} height={236} rx={6} fill="#9A5B27" />
    <g transform={`rotate(${n(Math.sin(frame * 0.05) * 1.2)} 0 -190)`}>
      <path d="M-120 -250 L70 -250 L120 -213 L70 -176 L-120 -176 Z" fill="#C98543" stroke="#7A4519" strokeWidth={5} />
      <text x={-18} y={-199} fontFamily={FONT} fontWeight={900} fontSize={42} fill="#FFF4D8" textAnchor="middle">
        البيت
      </text>
    </g>
  </g>
);

export const Foreground = ({ cam, frame }: { cam: number; frame: number }) => {
  const p = 1.5;
  const items: React.ReactNode[] = [];
  const r = makeRandom(404);
  for (let x = 0; x < layerWidth(p) + 600; x += 620 + r() * 640) {
    const px = sx(x, cam, p);
    const seed = r() * 10;
    const cluster = 2 + Math.floor(r() * 3);
    const hh = 130 + r() * 90; // stays below Coralo's feet so it never hides him
    if (visible(px, 160)) {
      for (let k = 0; k < cluster; k += 1) {
        items.push(
          <Blade
            key={`${x}-${k}`}
            x={px + k * 22}
            y={H + 20}
            h={hh * (1 - k * 0.15)}
            w={26 - k * 4}
            color="#0A5C4A"
            frame={frame}
            seed={seed + k}
            amp={26}
          />,
        );
      }
    }
  }
  return <g opacity={0.92}>{items}</g>;
};

export const Particles = ({ cam, frame }: { cam: number; frame: number }) => (
  <g>
    {dust.map((d, i) => {
      const x = mod(sx(d.x, cam, DUST_P) - frame * d.v, W + 200) - 100;
      const y = mod(d.y - frame * d.v * 0.4, H);
      return <circle key={`d${i}`} cx={n(x)} cy={n(y)} r={d.r} fill="#FFFFFF" opacity={0.35} />;
    })}
    {bubbles.map((b, i) => {
      const x = mod(sx(b.x, cam, BUBBLE_P), W + 300) - 150 + Math.sin(frame * 0.05 + b.ph) * b.wob;
      const y = mod(b.y - frame * b.v, H + 160) - 80;
      return (
        <g key={`b${i}`}>
          <circle cx={n(x)} cy={n(y)} r={n(b.r)} fill="#FFFFFF" fillOpacity={0.1} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} />
          <circle cx={n(x - b.r * 0.35)} cy={n(y - b.r * 0.35)} r={n(Math.max(1, b.r * 0.2))} fill="#FFFFFF" opacity={0.75} />
        </g>
      );
    })}
  </g>
);

// =====================================================================
// Sea life
// =====================================================================
const Fish = ({
  x, y, s, dir, color, belly, frame, ph,
}: {
  x: number; y: number; s: number; dir: 1 | -1; color: string; belly: string;
  frame: number; ph: number;
}) => {
  const wag = Math.sin(frame * 0.35 + ph) * 12;
  return (
    <g transform={`translate(${n(x)} ${n(y)}) scale(${n(dir * s)} ${n(s)})`}>
      <polygon points={`-26,0 -52,${n(-16 + wag * 0.4)} -52,${n(16 + wag * 0.4)}`} fill={color} />
      <ellipse cx={0} cy={0} rx={32} ry={17} fill={color} />
      <path d="M-26 4 Q0 20 30 4 Q0 14 -26 4 Z" fill={belly} opacity={0.9} />
      <path d="M-6 -16 Q4 -34 16 -14 Z" fill={color} opacity={0.85} />
      <rect x={4} y={-15} width={7} height={30} fill="#FFFFFF" opacity={0.35} />
      <circle cx={18} cy={-4} r={4.6} fill="#FFFFFF" />
      <circle cx={19} cy={-4} r={2.3} fill="#07070D" />
    </g>
  );
};

type School = {
  y: number; x: number; v: number; dir: 1 | -1; s: number;
  color: string; belly: string; count: number; seed: number; p: number;
};
const schools: School[] = [
  { y: 250, x: 200, v: 4.2, dir: 1, s: 0.62, color: '#FFD23F', belly: '#FFF2B0', count: 9, seed: 1, p: 0.45 },
  { y: 470, x: 1200, v: -3.1, dir: -1, s: 0.8, color: '#7FB5FF', belly: '#E4F0FF', count: 7, seed: 2, p: 0.55 },
  { y: 350, x: 2400, v: 5.2, dir: 1, s: 0.5, color: '#FF9AC8', belly: '#FFE0EF', count: 12, seed: 3, p: 0.4 },
  { y: 600, x: 3800, v: 3.6, dir: 1, s: 0.9, color: '#5EE0B2', belly: '#D6FFF1', count: 6, seed: 4, p: 0.6 },
  { y: 300, x: 5200, v: -4.4, dir: -1, s: 0.66, color: '#FFB05C', belly: '#FFE4C4', count: 8, seed: 5, p: 0.5 },
];

export const FishSchools = ({ cam, frame }: { cam: number; frame: number }) => (
  <g>
    {schools.map((sc) => {
      const r = makeRandom(sc.seed * 13);
      const loop = W + 1400;
      const baseX = mod(sc.x + sc.v * frame - cam * sc.p, loop) - 500;
      return (
        <g key={sc.seed}>
          {Array.from({ length: sc.count }, (_, i) => {
            const ox = (r() - 0.5) * 240;
            const oy = (r() - 0.5) * 150 + Math.sin(frame * 0.04 + i) * 8;
            return (
              <Fish
                key={i}
                x={baseX + ox}
                y={sc.y + oy}
                s={sc.s * (0.8 + r() * 0.4)}
                dir={sc.dir}
                color={sc.color}
                belly={sc.belly}
                frame={frame}
                ph={i}
              />
            );
          })}
        </g>
      );
    })}
  </g>
);

const Jelly = ({ x, y, s, frame, ph, color }: { x: number; y: number; s: number; frame: number; ph: number; color: string }) => {
  const pulse = 1 + 0.12 * Math.sin(frame * 0.12 + ph);
  const tentacles = Array.from({ length: 6 }, (_, i) => {
    const tx = -34 + i * 13.6;
    const sw = Math.sin(frame * 0.09 + ph + i) * 10;
    return (
      <path
        key={i}
        d={`M${n(tx)} 8 Q${n(tx + sw)} 55 ${n(tx - sw * 0.6)} ${n(100 + (i % 2) * 24)}`}
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
    );
  });
  return (
    <g transform={`translate(${n(x)} ${n(y + Math.sin(frame * 0.05 + ph) * 18)}) scale(${n(s)})`}>
      {tentacles}
      <path
        d={`M-42 8 Q-42 ${n(-48 * pulse)} 0 ${n(-48 * pulse)} Q42 ${n(-48 * pulse)} 42 8 Q0 20 -42 8 Z`}
        fill={color}
        opacity={0.55}
        stroke="#FFFFFF"
        strokeOpacity={0.5}
        strokeWidth={3}
      />
      <ellipse cx={-12} cy={n(-26 * pulse)} rx={10} ry={5} fill="#FFFFFF" opacity={0.4} />
    </g>
  );
};

export const Jellyfish = ({ cam, frame }: { cam: number; frame: number }) => (
  <g>
    {[
      { x: 900, y: 300, s: 1.1, ph: 0, c: '#E58BFF', p: 0.5 },
      { x: 2900, y: 220, s: 0.8, ph: 2, c: '#8FD3FF', p: 0.45 },
      { x: 4700, y: 360, s: 1.3, ph: 4, c: '#FFA6D5', p: 0.5 },
    ].map((j, i) => {
      const x = mod(j.x - cam * j.p + frame * 0.7, W + 800) - 400;
      return <Jelly key={i} x={x} y={j.y} s={j.s} frame={frame} ph={j.ph} color={j.c} />;
    })}
  </g>
);

export const Vignette = () => (
  <g>
    <defs>
      <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.6" stopColor="#021B33" stopOpacity="0" />
        <stop offset="1" stopColor="#021B33" stopOpacity="0.45" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#vig)" />
  </g>
);
