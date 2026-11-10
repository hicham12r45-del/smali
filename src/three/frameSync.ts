import { continueRender, delayRender } from 'remotion';

// Remotion must not take its screenshot before the 3D image of the CURRENT frame has been
// copied into the mirror canvas. beginFrame() holds the render, endFrame() releases it.
let lastFrame = -1;
let handle: number | null = null;

export const beginFrame = (frame: number): void => {
  if (frame === lastFrame) return;
  lastFrame = frame;
  if (handle !== null) continueRender(handle);
  handle = delayRender(`Drawing 3D frame ${frame}`);
};

export const endFrame = (frame: number): void => {
  if (handle !== null && frame === lastFrame) {
    continueRender(handle);
    handle = null;
  }
};
