import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Scene3D } from './three/Scene3D';
import { preloadLabels } from './three/House3D';
import { beginFrame } from './three/frameSync';
import { useCairo } from './lib/fonts';
import { smoothstep } from './lib/math';
import { H, TOTAL, W } from './lib/timeline';

const FONT = "Cairo, 'Noto Sans Arabic', sans-serif";

const Titles: React.FC<{ frame: number }> = ({ frame }) => {
  const a = smoothstep(8, 28, frame) * (1 - smoothstep(92, 118, frame));
  const aRise = (1 - smoothstep(8, 34, frame)) * 30;
  const b = smoothstep(672, 694, frame);
  const bRise = (1 - smoothstep(672, 700, frame)) * 24;
  const stroke = (c: string, w: number): React.CSSProperties => ({
    WebkitTextStroke: `${w}px ${c}`,
    paintOrder: 'stroke fill',
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, direction: 'rtl', textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 70, width: '100%', opacity: a, transform: `translateY(${aRise}px)` }}>
        <div style={{ fontSize: 128, fontWeight: 900, color: '#fff', ...stroke('#05324F', 14), textShadow: '0 8px 30px rgba(0,30,60,.45)' }}>
          رحلة كورالو إلى البيت
        </div>
        <div style={{ direction: 'ltr', fontSize: 46, fontWeight: 700, color: '#E9FBFF', marginTop: 6, ...stroke('#05324F', 8) }}>
          Coralo&apos;s Journey Home
        </div>
      </div>
      <div style={{ position: 'absolute', top: 90, width: '100%', opacity: b, transform: `translateY(${bRise}px)` }}>
        <div style={{ fontSize: 124, fontWeight: 900, color: '#FFF3B0', ...stroke('#4A2400', 14), textShadow: '0 8px 30px rgba(40,20,0,.5)' }}>
          وأخيراً.. في البيت!
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Journey3D: React.FC = () => {
  const frame = useCurrentFrame();
  useCairo();
  const [labelsReady, setLabelsReady] = useState(false);
  const [labelHandle] = useState(() => delayRender('Preparing 3D labels'));
  useEffect(() => {
    preloadLabels()
      .catch((e) => console.error(e))
      .finally(() => {
        setLabelsReady(true);
        continueRender(labelHandle);
      });
  }, [labelHandle]);
  if (labelsReady) beginFrame(frame);
  const fade = smoothstep(TOTAL - 14, TOTAL, frame) * 0.85;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0E78AB' }}>
      {labelsReady ? (
      <ThreeCanvas
        width={W}
        height={H}
        shadows
        frameloop="demand"
        gl={{ antialias: false, preserveDrawingBuffer: true }}
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
        camera={{ fov: 38, near: 0.1, far: 400, position: [0, 2.5, 9] }}
      >
        <Scene3D frame={frame} />
      </ThreeCanvas>
      ) : null}
      <canvas
        id="coralo-mirror"
        width={W}
        height={H}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(2,27,51,0) 58%, rgba(2,27,51,0.42) 100%)',
        }}
      />
      <Titles frame={frame} />
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: fade }} />
      <Audio src={staticFile('audio/sea-journey.wav')} volume={0.9} />
    </AbsoluteFill>
  );
};

