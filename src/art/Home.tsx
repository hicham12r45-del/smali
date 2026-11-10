import React from 'react';
import { deg, mod, n } from '../lib/math';
import { FONT } from './palette';

/**
 * Coralo's home: a giant spiral shell with a round wooden door.
 * Origin (0,0) = ground in front of the door centre. +y is down.
 */
type HomeProps = {
  /** 0 closed .. 1 wide open */
  door: number;
  /** 0 dim windows .. 1 fully lit */
  lights: number;
  frame: number;
};

const DoorShape = 'M-62 0 L-62 -112 A62 62 0 0 1 62 -112 L62 0 Z';

export const Home = ({ door, lights, frame }: HomeProps) => {
  const glow = 0.35 + 0.65 * lights;
  const panelScale = 1 - 0.86 * door;

  const ribs = [
    'M-300 -90 Q-230 -250 -40 -330',
    'M-210 -60 Q-120 -230 60 -330',
    'M-110 -40 Q0 -210 160 -320',
    'M0 -30 Q110 -190 250 -280',
    'M-200 -330 Q-140 -440 -20 -465',
    'M-120 -300 Q-60 -410 40 -450',
  ];

  const chimneyBubbles = Array.from({ length: 6 }, (_, i) => {
    const age = mod(frame * 1.1 + i * 26, 156);
    const x = -98 + Math.sin(age * 0.07 + i) * 14 + age * 0.12;
    const y = -588 - age * 1.5;
    const o = Math.min(1, age / 18) * (1 - age / 156);
    return (
      <circle
        key={i}
        cx={n(x)}
        cy={n(y)}
        r={n(6 + age * 0.07)}
        fill="#FFFFFF"
        fillOpacity={0.14}
        stroke="#FFFFFF"
        strokeOpacity={n(0.7 * o)}
        strokeWidth={2.5}
      />
    );
  });

  const stones = [-150, -250, -355, -470].map((x, i) => (
    <ellipse
      key={x}
      cx={x}
      cy={26 + (i % 2) * 14}
      rx={46 - i * 3}
      ry={13}
      fill="#D9C89E"
      stroke="#B79F6F"
      strokeWidth={3}
    />
  ));

  return (
    <g>
      <defs>
        <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB5CB" />
          <stop offset="1" stopColor="#F2819F" />
        </linearGradient>
        <radialGradient id="doorLight" cx="0.5" cy="0.8" r="0.8">
          <stop offset="0" stopColor="#FFF6C2" />
          <stop offset="1" stopColor="#FFC24D" />
        </radialGradient>
        <radialGradient id="windowGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3B8" />
          <stop offset="1" stopColor="#FFB93D" />
        </radialGradient>
        <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9A0" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFE9A0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* stepping stones and ground shadow */}
      {stones}
      <ellipse cx={0} cy={10} rx={380} ry={30} fill="#7A5A24" opacity={0.28} />

      {/* light spilling out of the door */}
      <polygon
        points="-62,0 62,0 230,150 -230,150"
        fill="url(#spill)"
        opacity={n(door * 0.9)}
      />

      {/* chimney */}
      <rect x={-125} y={-600} width={40} height={64} rx={8} fill="#2C9AA0" stroke="#1D6E73" strokeWidth={4} />
      <rect x={-131} y={-608} width={52} height={14} rx={6} fill="#3CB6BC" />
      {chimneyBubbles}

      {/* shell whorls */}
      <ellipse cx={-35} cy={-565} rx={72} ry={58} fill="#FFDCE7" stroke="#E58DAA" strokeWidth={5} />
      <ellipse cx={-50} cy={-480} rx={142} ry={98} fill="#FFCFDD" stroke="#E58DAA" strokeWidth={5} />
      <ellipse cx={-30} cy={-345} rx={232} ry={142} fill="#FFC0D3" stroke="#E58DAA" strokeWidth={5} />
      <ellipse cx={0} cy={-172} rx={332} ry={178} fill="url(#shell)" stroke="#D96A8E" strokeWidth={6} />
      {ribs.map((d, i) => (
        <path key={i} d={d} stroke="#E0789A" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.55} />
      ))}
      <path d="M-290 -230 Q-250 -320 -150 -350" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.35} />
      <path d="M-170 -450 Q-130 -520 -70 -535" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.4} />

      {/* round windows */}
      <g>
        <circle cx={120} cy={-318} r={52} fill="url(#windowGlow)" opacity={n(glow)} />
        <circle cx={120} cy={-318} r={52} fill="none" stroke="#E0A63A" strokeWidth={11} />
        <path d="M120 -370 V-266 M68 -318 H172" stroke="#E0A63A" strokeWidth={6} />
        <circle cx={-52} cy={-474} r={30} fill="url(#windowGlow)" opacity={n(glow)} />
        <circle cx={-52} cy={-474} r={30} fill="none" stroke="#E0A63A" strokeWidth={8} />
      </g>

      {/* hanging name plate */}
      <g>
        <path d="M-70 -246 L-56 -214 M70 -246 L56 -214" stroke="#7A4519" strokeWidth={4} />
        <rect x={-100} y={-262} width={200} height={50} rx={10} fill="#C98543" stroke="#7A4519" strokeWidth={5} />
        <text x={0} y={-226} fontFamily={FONT} fontWeight={900} fontSize={34} fill="#FFF4D8" textAnchor="middle">
          بيت كورالو
        </text>
      </g>

      {/* door: frame, warm interior, wooden panel swinging open */}
      <path d={DoorShape} fill="url(#doorLight)" opacity={n(0.25 + 0.75 * door)} />
      <path d={DoorShape} fill="#3A1A0C" opacity={n(0.9 * (1 - door))} />
      <g transform={`translate(-62 0) scale(${n(panelScale)} 1) translate(62 0)`}>
        <path d={DoorShape} fill="#B5651D" stroke="#6E3A12" strokeWidth={6} />
        <path d="M-30 0 V-150 M0 0 V-170 M30 0 V-150" stroke="#8A4A14" strokeWidth={4} />
        <circle cx={36} cy={-66} r={7} fill="#FFC733" stroke="#B88A12" strokeWidth={2} />
      </g>
      <path d={DoorShape} fill="none" stroke="#6E3A12" strokeWidth={10} strokeLinejoin="round" />
      <rect x={-78} y={-4} width={156} height={12} rx={6} fill="#8A4A14" />

      {/* fence */}
      {[-215, -255, -295].map((x) => (
        <rect key={x} x={x - 6} y={-60} width={12} height={64} rx={5} fill="#F4E7C8" stroke="#C9B98E" strokeWidth={2} />
      ))}

      {/* mailbox */}
      <g transform="translate(250 0)">
        <rect x={-5} y={-92} width={10} height={92} fill="#8A5A2B" />
        <path d="M-34 -92 Q-34 -134 0 -134 Q34 -134 34 -92 Z" fill="#6B3FD1" stroke="#432497" strokeWidth={4} />
        <rect x={20} y={-120} width={5} height={26} fill="#FF5A3C" />
      </g>

      {/* lantern */}
      <g transform="translate(-520 0)">
        <rect x={-5} y={-190} width={10} height={190} rx={4} fill="#5A3A1E" />
        <circle cx={0} cy={-206} r={n(54 * glow)} fill="#FFE08A" opacity={n(0.25 * glow)} />
        <rect x={-16} y={-232} width={32} height={42} rx={9} fill="#FFE08A" stroke="#B88A12" strokeWidth={4} opacity={n(0.55 + 0.45 * lights)} />
      </g>

      {/* little flower pots */}
      {[-110, 110].map((x) => (
        <g key={x} transform={`translate(${x} 6)`}>
          <path d="M-18 0 L18 0 L12 -26 L-12 -26 Z" fill="#E8744F" />
          <path d={`M0 -26 Q${n(Math.sin(frame * 0.05 + x) * 6)} -48 0 -62`} stroke="#2FA36B" strokeWidth={5} strokeLinecap="round" fill="none" />
          <circle cx={0} cy={-66} r={10} fill="#FFE86B" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={n(Math.cos(deg(a)) * 12)} cy={n(-66 + Math.sin(deg(a)) * 12)} r={6} fill="#FFFFFF" opacity={0.95} />
          ))}
          <circle cx={0} cy={-66} r={6} fill="#FFC733" />
        </g>
      ))}
    </g>
  );
};
