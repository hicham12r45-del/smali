import React from 'react';
import { Coralo, CoraloPose } from './Coralo';
import { Home } from './Home';
import {
  FishSchools, Foreground, FarLayers, GroundProps, Jellyfish, MidLayer,
  Particles, Sand, SignPost, Vignette, Water,
} from './Sea';
import { FONT } from './palette';
import { clamp, mod, n, progress, smoothstep } from '../lib/math';
import {
  CAM_MAX, DOOR_X, ENTER_END, ENTER_START, GREET_END, GREET_START, GROUND_Y,
  H, START_X, STEP_CYCLE, TOTAL, W, WAVE_END, cameraX, cameraZoom, charWorldX,
  doorOpen, fadeToBlack, turnAmount,
} from '../lib/timeline';

const BLINKS = [38, 150, 262, 380, 492, 596, 640];

const blinkAt = (frame: number): number => {
  let b = 0;
  for (const start of BLINKS) {
    const t = (frame - start) / 7;
    if (t >= 0 && t <= 1) b = Math.max(b, Math.sin(t * Math.PI));
  }
  return b;
};

const hopAt = (frame: number, start: number, len = 16, h = 46): number => {
  const t = (frame - start) / len;
  return t >= 0 && t <= 1 ? h * Math.sin(t * Math.PI) : 0;
};

const buildPose = (frame: number): CoraloPose => {
  const x = charWorldX(frame);
  const prev = charWorldX(Math.max(0, frame - 1));
  const speed = x - prev;
  const walk = clamp(speed / 7);
  const enter = smoothstep(ENTER_START, ENTER_END, frame);

  const wave1 = smoothstep(2, 12, frame) - smoothstep(WAVE_END - 14, WAVE_END, frame);
  const wave2 =
    smoothstep(GREET_START - 6, GREET_START + 8, frame) -
    smoothstep(GREET_END - 12, GREET_END, frame);
  const wave = clamp(Math.max(wave1, wave2));

  return {
    phase: (2 * Math.PI * (x - START_X)) / STEP_CYCLE,
    walk,
    turn: turnAmount(frame),
    blink: blinkAt(frame),
    mouthOpen: clamp(wave * 0.75 + 0.55 * smoothstep(GREET_START, GREET_START + 10, frame) * (1 - smoothstep(GREET_END, GREET_END + 8, frame))),
    wave,
    wavePhase: frame * 0.55,
    jump: hopAt(frame, 612) + hopAt(frame, 632),
    squash: 0.012 * Math.sin(frame * 0.12) * (1 - walk),
    sprout: 0.12 * Math.sin(frame * 0.09) - 0.16 * walk,
    scale: 1 - 0.42 * enter,
    opacity: 1 - smoothstep(0.55, 0.96, enter),
  };
};

const Title = ({ frame }: { frame: number }) => {
  const inO = smoothstep(8, 28, frame) * (1 - smoothstep(92, 118, frame));
  const rise = (1 - smoothstep(8, 34, frame)) * 30;
  const endO = smoothstep(672, 694, frame);
  const endRise = (1 - smoothstep(672, 700, frame)) * 24;
  return (
    <g fontFamily={FONT} textAnchor="middle" fontWeight={900}>
      <g opacity={n(inO)} transform={`translate(0 ${n(rise)})`}>
        <text x={W / 2} y={190} fontSize={128} fill="#FFFFFF" stroke="#05324F" strokeWidth={14} paintOrder="stroke">
          رحلة كورالو إلى البيت
        </text>
        <text x={W / 2} y={262} fontSize={46} fontWeight={700} fill="#E9FBFF" stroke="#05324F" strokeWidth={8} paintOrder="stroke">
          Coralo's Journey Home
        </text>
      </g>
      <g opacity={n(endO)} transform={`translate(0 ${n(endRise)})`}>
        <text x={W / 2} y={200} fontSize={124} fill="#FFF3B0" stroke="#4A2400" strokeWidth={14} paintOrder="stroke">
          وأخيراً.. في البيت!
        </text>
      </g>
    </g>
  );
};

const MouthBubbles = ({ frame, sx, sy }: { frame: number; sx: number; sy: number }) => {
  const out: React.ReactNode[] = [];
  const active = frame > 20 && frame < ENTER_START + 10;
  if (!active) return null;
  for (let k = 0; k < 12; k += 1) {
    const spawn = Math.floor((frame - 20) / 34) * 34 + 20 - k * 34;
    const age = frame - spawn;
    if (age < 0 || age > 80 || spawn < 20) continue;
    const x = sx + 34 + Math.sin(age * 0.3 + k) * 9 + age * 0.4;
    const y = sy - 160 - age * 2.1;
    const r = 5 + age * 0.09;
    out.push(
      <circle
        key={spawn}
        cx={n(x)}
        cy={n(y)}
        r={n(r)}
        fill="#FFFFFF"
        fillOpacity={0.14}
        stroke="#FFFFFF"
        strokeOpacity={n(0.75 * (1 - age / 80))}
        strokeWidth={2.5}
      />,
    );
  }
  return <g>{out}</g>;
};

/** The whole film as one pure function of the frame number. */
export const Scene = ({ frame }: { frame: number }) => {
  const f = clamp(frame, 0, TOTAL);
  const cam = cameraX(f);
  const zoom = cameraZoom(f);
  const door = clamp(doorOpen(f));
  const doorScreenX = DOOR_X - cam;
  const charX = charWorldX(f) - cam;
  const lights = smoothstep(560, 640, f);
  const bob = Math.sin(f * 0.04) * 4;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', backgroundColor: '#0A4F80' }}
    >
      <Water frame={f} />
      <g
        transform={`translate(${n(doorScreenX)} 640) scale(${n(zoom)}) translate(${n(-doorScreenX)} ${n(-640 + bob)})`}
      >
        <FarLayers cam={cam} />
        <MidLayer cam={cam} frame={f} />
        <Jellyfish cam={cam} frame={f} />
        <FishSchools cam={cam} frame={f} />
        <Sand cam={cam} />
        <GroundProps cam={cam} />
        <SignPost x={1750 - cam} frame={f} />
        <SignPost x={DOOR_X - 1500 - cam} frame={f} />
        <g transform={`translate(${n(doorScreenX)} ${GROUND_Y + 46})`}>
          <Home door={door} lights={lights} frame={f} />
        </g>
        <g transform={`translate(${n(charX)} ${GROUND_Y + 40})`}>
          <Coralo pose={buildPose(f)} />
        </g>
        <MouthBubbles frame={f} sx={charX} sy={GROUND_Y + 40} />
      </g>
      <Particles cam={cam} frame={f} />
      <Foreground cam={cam} frame={f} />
      <Vignette />
      <Title frame={f} />
      <rect width={W} height={H} fill="#000000" opacity={n(fadeToBlack(f) * 0.85)} />
    </svg>
  );
};

