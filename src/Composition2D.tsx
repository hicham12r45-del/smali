import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { useCairo } from './lib/fonts';
import { Scene } from './art/Scene';

export const Journey2D: React.FC = () => {
  const frame = useCurrentFrame();
  useCairo();
  return (
    <AbsoluteFill style={{ backgroundColor: '#0A4F80' }}>
      <Scene frame={frame} />
      <Audio src={staticFile('audio/sea-journey.wav')} volume={0.9} />
    </AbsoluteFill>
  );
};
