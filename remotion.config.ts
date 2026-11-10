import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// WebGL on machines without a GPU (GitHub Actions) goes through SwiftShader/ANGLE.
Config.setChromiumOpenGlRenderer('swangle');
// the first frame loads the 2.3 MB model and fonts
Config.setDelayRenderTimeoutInMilliseconds(180000);
