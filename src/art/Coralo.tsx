import React from 'react';
import { C } from './palette';
import { deg, makeRandom, n } from '../lib/math';

/**
 * Coralo: the original square sea-sponge character, drawn as pure SVG.
 * Origin (0,0) is the point on the ground between his feet; +y is down.
 * The proportions follow the Blender model (1 Blender unit = 100 px).
 */
export type CoraloPose = {
  /** step phase in radians (drives legs, arms, bounce) */
  phase: number;
  /** 0 = standing still, 1 = full walking motion */
  walk: number;
  /** 0 = facing the viewer, 1 = side view heading right */
  turn: number;
  /** 0..1 blink amount */
  blink: number;
  /** 0..1 how wide the mouth is open */
  mouthOpen: number;
  /** 0..1 waving strength (left arm) */
  wave: number;
  /** wave oscillation phase in radians */
  wavePhase: number;
  /** extra vertical jump in px (joy hops) */
  jump: number;
  /** squash (+) / stretch (-) amount, e.g. 0.08 */
  squash: number;
  /** sprout sway in radians */
  sprout: number;
  /** overall scale */
  scale?: number;
  /** overall opacity */
  opacity?: number;
};

const LEG_X = 45;
const HIP_Y = -90;

const poresFront = (() => {
  const r = makeRandom(11);
  const list: Array<[number, number, number]> = [];
  let guard = 0;
  while (list.length < 15 && guard++ < 400) {
    const x = (r() - 0.5) * 176;
    const y = -(104 + r() * 200);
    // keep the face and shorts free of pores
    const onFace = Math.abs(x) < 82 && y > -292 && y < -140;
    const onShorts = y > -146;
    if (onFace || onShorts) continue;
    if (list.some(([px, py]) => Math.hypot(px - x, py - y) < 22)) continue;
    list.push([x, y, 2.6 + r() * 3.6]);
  }
  return list;
})();

type ArmProps = {
  side: 1 | -1;
  shoulder: [number, number];
  a1: number; // upper arm angle from straight down (deg), + = away from body
  a2: number; // forearm bend (deg)
};

const Arm = ({ side, shoulder, a1, a2 }: ArmProps) => {
  const upper = 70;
  const fore = 62;
  const d1 = deg(a1);
  const d2 = deg(a1 + a2);
  const ex = shoulder[0] + side * Math.sin(d1) * upper;
  const ey = shoulder[1] + Math.cos(d1) * upper;
  const wx = ex + side * Math.sin(d2) * fore;
  const wy = ey + Math.cos(d2) * fore;
  const dx = side * Math.sin(d2);
  const dy = Math.cos(d2);
  const px = -dy;
  const py = dx;
  const thumbSide = -side;
  return (
    <g>
      <path
        d={`M${n(shoulder[0])} ${n(shoulder[1])} L${n(ex)} ${n(ey)} L${n(wx)} ${n(wy)}`}
        stroke={C.limb}
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={n(shoulder[0])} cy={n(shoulder[1])} r={10} fill={C.limb} />
      <circle cx={n(ex)} cy={n(ey)} r={8} fill={C.limb} />
      <circle cx={n(wx + dx * 14)} cy={n(wy + dy * 14)} r={19} fill={C.hand} />
      <circle
        cx={n(wx + dx * 8 + px * thumbSide * 17)}
        cy={n(wy + dy * 8 + py * thumbSide * 17)}
        r={8}
        fill={C.hand}
      />
      <circle cx={n(wx + dx * 20 - px * thumbSide * 2)} cy={n(wy + dy * 20 - py * thumbSide * 2)} r={9} fill="#FFFFFF" opacity={0.16} />
    </g>
  );
};

type LegProps = {
  side: 1 | -1;
  angle: number;
  lift: number;
  turn: number;
};

const Leg = ({ side, angle, lift, turn }: LegProps) => {
  const x = side * LEG_X;
  const toe = 10 * turn;
  return (
    <g transform={`translate(${x} ${HIP_Y}) rotate(${n(angle)}) translate(${-x} ${-HIP_Y}) translate(0 ${n(-lift)})`}>
      {/* skin */}
      <rect x={x - 8} y={-92} width={16} height={44} rx={7} fill={C.limb} />
      {/* rain boot */}
      <rect x={x - 15} y={-54} width={30} height={42} rx={8} fill={C.boot} />
      <rect x={x - 17} y={-58} width={34} height={11} rx={5} fill={C.bootCuff} />
      <ellipse cx={x + toe} cy={-4} rx={34} ry={7.5} fill={C.sole} />
      <ellipse cx={x + toe + 8} cy={-14} rx={29} ry={14} fill={C.shoe} />
      <ellipse cx={x + toe + 2} cy={-21} rx={13} ry={4.5} fill="#FFFFFF" opacity={0.25} />
    </g>
  );
};

const Eye = ({
  cx,
  cy,
  look,
  blink,
}: {
  cx: number;
  cy: number;
  look: [number, number];
  blink: number;
}) => {
  const open = 1 - 0.92 * blink;
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${n(open)})`}>
      <ellipse rx={35} ry={39} fill={C.eyeWhite} stroke="#E4DDD6" strokeWidth={2} />
      <circle cx={n(look[0])} cy={n(look[1])} r={16} fill={C.iris} />
      <circle cx={n(look[0])} cy={n(look[1])} r={8} fill={C.pupil} />
      <circle cx={n(look[0] + 4)} cy={n(look[1] - 5)} r={4.2} fill="#FFFFFF" />
      <circle cx={n(look[0] - 6)} cy={n(look[1] + 6)} r={2} fill="#FFFFFF" />
    </g>
  );
};

export const Coralo = ({ pose }: { pose: CoraloPose }) => {
  const { phase, walk, turn, blink, mouthOpen, wave, wavePhase } = pose;
  const s = Math.sin(phase);
  const c = Math.cos(phase);

  // gait: legs swing in opposite directions, the lifted foot rises
  const legAmp = 28 * walk;
  const legL = legAmp * s;
  const legR = -legAmp * s;
  const liftL = Math.max(0, s) * 16 * walk;
  const liftR = Math.max(0, -s) * 16 * walk;

  // hop + squash and stretch
  const hop = Math.abs(s) * 13 * walk + pose.jump;
  const squash = pose.squash + 0.035 * Math.cos(phase * 2) * walk;
  const sx = 1 + squash;
  const sy = 1 - squash;
  const lean = 5 * turn * walk;

  // look direction of the pupils
  const look: [number, number] = [9 * turn, 1];

  // arms
  const restL = 49;
  const swingL = 26 * walk * Math.sin(phase + Math.PI);
  const swingR = 26 * walk * s;
  const leftA1 = restL * (1 - wave) + 128 * wave + swingL * (1 - wave) - 8 * turn;
  const leftA2 =
    (-34 + 6 * walk * c) * (1 - wave) + (34 + 26 * Math.sin(wavePhase)) * wave;
  const rightA1 = restL + swingR + 8 * turn * 0;
  const rightA2 = -34 + 14 * walk * Math.cos(phase);

  const bodyTop = -310;
  const bodyBottom = -90;
  const shoulderY = -214;
  const shoulderX = 100 * sx;

  const sproutRot = n((pose.sprout * 180) / Math.PI);
  const smile = 122 - mouthOpen * 26;

  return (
    <g
      opacity={pose.opacity ?? 1}
      transform={`scale(${n(pose.scale ?? 1)})`}
    >
      {/* ground shadow */}
      <ellipse
        cx={0}
        cy={4}
        rx={n(112 - hop * 0.8)}
        ry={n(15 - hop * 0.12)}
        fill="#04202F"
        opacity={0.35}
      />
      <g transform={`translate(0 ${n(-hop)}) rotate(${n(lean)} 0 -90)`}>
        <Leg side={-1} angle={legL} lift={liftL} turn={turn} />
        <Leg side={1} angle={legR} lift={liftR} turn={turn} />

        {/* arms behind the body */}
        <Arm
          side={1}
          shoulder={[shoulderX - 4, shoulderY]}
          a1={rightA1}
          a2={rightA2}
        />

        {/* body */}
        <g transform={`translate(0 ${bodyBottom}) scale(${n(sx)} ${n(sy)}) translate(0 ${-bodyBottom})`}>
          <defs>
            <linearGradient id="coraloBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={C.bodyB} />
              <stop offset="1" stopColor={C.bodyA} />
            </linearGradient>
            <radialGradient id="coraloShade" cx="0.3" cy="0.25" r="0.9">
              <stop offset="0.5" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#7A1A00" stopOpacity="0.38" />
            </radialGradient>
          </defs>
          <rect
            x={-100}
            y={bodyTop}
            width={200}
            height={220}
            rx={28}
            fill="url(#coraloBody)"
            stroke={C.bodyEdge}
            strokeWidth={4}
          />
          <rect x={-100} y={bodyTop} width={200} height={220} rx={28} fill="url(#coraloShade)" />
          <path
            d="M-90 -286 Q-90 -304 -70 -304 L-30 -304"
            stroke="#FFFFFF"
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.3}
            fill="none"
          />
          {/* purple spots */}
          <ellipse cx={-80} cy={-288} rx={19} ry={13} fill={C.spot} opacity={0.9} />
          <ellipse cx={74} cy={-282} rx={14} ry={10} fill={C.spot} opacity={0.9} />
          <ellipse cx={82} cy={-158} rx={12} ry={9} fill={C.spot} opacity={0.9} />
          <ellipse cx={-82} cy={-160} rx={11} ry={8} fill={C.spot} opacity={0.9} />
          {/* pores */}
          {poresFront.map(([x, y, r], i) => (
            <ellipse key={i} cx={n(x)} cy={n(y)} rx={n(r)} ry={n(r * 0.8)} fill={C.pore} opacity={0.85} />
          ))}

          {/* eyes */}
          <Eye cx={-42} cy={-245} look={look} blink={blink} />
          <Eye cx={42} cy={-245} look={look} blink={blink} />
          {[-1, 1].map((side) => {
            const bx = side * 42;
            const lift = mouthOpen * 7 + wave * 5;
            const by = -296 - lift - 2 * (1 - 0.92 * blink);
            return (
              <path
                key={side}
                d={`M${n(bx - 26)} ${n(by + 8)} Q${n(bx)} ${n(by - 8)} ${n(bx + 26)} ${n(by + 8)}`}
                stroke={C.brow}
                strokeWidth={8}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}

          {/* nose */}
          <ellipse cx={0} cy={-206} rx={11} ry={17} fill={C.nose} />
          <ellipse cx={-3} cy={-212} rx={4} ry={6} fill="#FFFFFF" opacity={0.3} />

          {/* cheeks + freckles */}
          <ellipse cx={-68} cy={-186} rx={21} ry={14} fill={C.cheek} opacity={0.55} />
          <ellipse cx={68} cy={-186} rx={21} ry={14} fill={C.cheek} opacity={0.55} />
          {[-1, 1].map((side) =>
            [
              [-7, -6],
              [7, -4],
              [0, 6],
            ].map(([dx, dy], i) => (
              <circle key={`${side}-${i}`} cx={side * 68 + dx} cy={-186 + dy} r={2.8} fill={C.freckle} />
            )),
          )}

          {/* mouth */}
          {mouthOpen > 0.02 && (
            <path
              d={`M-62 -182 Q0 ${n(-smile)} 62 -182 Q0 -190 -62 -182 Z`}
              fill={C.mouthIn}
            />
          )}
          <path
            d={`M-62 -182 Q0 ${n(-smile)} 62 -182`}
            stroke={C.mouth}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
          <path d="M-68 -192 Q-72 -182 -66 -174" stroke={C.mouth} strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M68 -192 Q72 -182 66 -174" stroke={C.mouth} strokeWidth={4} strokeLinecap="round" fill="none" />
        </g>

        {/* trunks with a rope tie */}
        <rect x={-105} y={-138} width={210} height={48} rx={12} fill={C.shorts} />
        <rect x={-105} y={-104} width={210} height={14} rx={7} fill={C.shortsDark} opacity={0.55} />
        <path
          d="M-96 -112 Q-80 -124 -64 -112 T-32 -112 T0 -112 T32 -112 T64 -112 T96 -112"
          stroke={C.shortsWave}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
        <path
          d="M-96 -98 Q-80 -110 -64 -98 T-32 -98 T0 -98 T32 -98 T64 -98 T96 -98"
          stroke={C.shortsWave}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />
        <rect x={-105} y={-146} width={210} height={10} rx={5} fill={C.rope} />
        <ellipse cx={-14} cy={-141} rx={14} ry={9} fill={C.rope} stroke={C.ropeDark} strokeWidth={2} />
        <ellipse cx={14} cy={-141} rx={14} ry={9} fill={C.rope} stroke={C.ropeDark} strokeWidth={2} />
        <circle cx={0} cy={-141} r={6} fill={C.ropeDark} />
        <path d="M-3 -136 Q-10 -122 -16 -112" stroke={C.rope} strokeWidth={6} strokeLinecap="round" fill="none" />
        <path d="M3 -136 Q10 -122 18 -114" stroke={C.rope} strokeWidth={6} strokeLinecap="round" fill="none" />

        {/* left arm waves, drawn in front of the body */}
        <Arm
          side={-1}
          shoulder={[-shoulderX + 4, shoulderY]}
          a1={leftA1}
          a2={leftA2}
        />

        {/* sprout */}
        <g transform={`translate(0 ${bodyTop + 4}) rotate(${sproutRot})`}>
          <path d="M0 0 Q-6 -22 3 -42" stroke={C.stem} strokeWidth={9} strokeLinecap="round" fill="none" />
          <ellipse cx={-22} cy={-52} rx={22} ry={9} fill={C.leaf} transform="rotate(28 -22 -52)" />
          <ellipse cx={26} cy={-52} rx={22} ry={9} fill={C.leaf} transform="rotate(-28 26 -52)" />
          <circle cx={3} cy={-50} r={6} fill={C.leaf} />
        </g>
      </g>
    </g>
  );
};
