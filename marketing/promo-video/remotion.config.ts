import { Config } from '@remotion/cli/config';

// Master settings: 1080p60 H.264 at a high-quality CRF, with GPU WebGL for @remotion/effects.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setX264Preset('slow');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setAudioCodec('aac');
Config.setAudioBitrate('320k');
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(8);
Config.setOverwriteOutput(true);
// The webpack cache is large and only speeds up repeat bundling.
Config.setCachingEnabled(false);
