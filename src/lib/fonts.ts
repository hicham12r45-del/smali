import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

// Cairo (Arabic + Latin) is bundled in public/fonts, so rendering never depends on the network.
const RANGES: Record<string, string> = {
  arabic:
    'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC',
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

let cached: Promise<void> | null = null;

export const loadCairo = (): Promise<void> => {
  if (cached) return cached;
  const jobs: Array<Promise<unknown>> = [];
  for (const subset of ['arabic', 'latin']) {
    for (const weight of ['700', '900']) {
      const face = new FontFace(
        'Cairo',
        `url(${staticFile(`fonts/cairo-${subset}-${weight}-normal.woff2`)}) format('woff2')`,
        { weight, unicodeRange: RANGES[subset] },
      );
      jobs.push(face.load().then((f) => document.fonts.add(f)));
    }
  }
  cached = Promise.all(jobs).then(() => undefined);
  return cached;
};

/** Holds the render until Cairo is ready. */
export const useCairo = (): void => {
  const [handle] = useState(() => delayRender('Loading the Cairo font'));
  useEffect(() => {
    loadCairo()
      .catch((err) => console.error('Font load failed', err))
      .finally(() => continueRender(handle));
  }, [handle]);
};
