import { Composition } from 'remotion';
import { Journey2D } from './Composition2D';
import { Journey3D } from './Composition3D';
import { FPS, H, TOTAL, W } from './lib/timeline';

export const RemotionRoot = () => {
  return (
    <>
      {/* main film: the 3D version using the rigged Coralo model */}
      <Composition
        id="MyComposition"
        component={Journey3D}
        durationInFrames={TOTAL}
        fps={FPS}
        width={W}
        height={H}
      />
      {/* the earlier 2D version */}
      <Composition
        id="Journey2D"
        component={Journey2D}
        durationInFrames={TOTAL}
        fps={FPS}
        width={W}
        height={H}
      />
    </>
  );
};
