import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { KineticText, SubText } from '../components/KineticText';
import { useStage } from '../layout';
import { clamp, easeOut, pop, tween } from '../lib/anim';
import timeline from '../timeline.json';
import { color, display } from '../theme';

const { cues } = timeline;
const FROM = timeline.scenes.cta.from;

/** End card: the logo lands, the address holds long enough to read, then the disclaimer. */
export const Cta: React.FC = () => {
  const f = useCurrentFrame() + FROM;
  const { fps } = useVideoConfig();
  const stage = useStage();
  const p = stage.portrait;

  const logoP = pop(f, cues.logoHit, fps);
  const glow = interpolate(f - cues.logoHit, [0, 6, 70], [0, 1, 0.35], clamp);
  const shine = interpolate(f - cues.logoHit, [4, 44], [-40, 140], { ...clamp, easing: easeOut });
  const urlP = tween(f, [cues.logoHit + 34, cues.logoHit + 64], [0, 1]);
  const legal = tween(f, [cues.logoHit + 90, cues.logoHit + 120], [0, 1]);
  const fadeOut = tween(f, [timeline.durationInFrames - 24, timeline.durationInFrames - 2], [0, 1]);

  const logo = p ? 190 : 150;
  const top = p ? 560 : 170;

  return (
    <AbsoluteFill style={{ opacity: 1 - fadeOut }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: logo,
            height: logo,
            scale: `${0.6 + 0.4 * logoP}`,
            opacity: Math.min(1, logoP * 2),
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -logo * 0.9,
              background:
                'radial-gradient(closest-side, rgba(56, 189, 248, 0.5), rgba(0, 225, 255, 0.12) 50%, transparent)',
              opacity: glow,
            }}
          />
          <Img
            src={staticFile('brand/esotk-logo.svg')}
            style={{ position: 'absolute', inset: 0, width: logo, height: logo }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              maskImage: `url(${staticFile('brand/esotk-logo.svg')})`,
              maskSize: '100% 100%',
              background: `linear-gradient(115deg, transparent ${shine - 20}%, rgba(255,255,255,0.95) ${shine}%, transparent ${shine + 20}%)`,
            }}
          />
        </div>
        <div style={{ marginTop: p ? 44 : 30 }}>
          <KineticText
            text="Your log, upgraded."
            start={cues.logoHit + 10 - FROM}
            size={p ? 84 : 92}
            align="center"
            weight={600}
          />
        </div>
        <div
          style={{
            marginTop: p ? 34 : 22,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            opacity: urlP,
            translate: `0 ${(1 - urlP) * 16}px`,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: p ? 64 : 58,
              letterSpacing: '-0.01em',
              background: `linear-gradient(135deg, #ffffff, ${color.sky} 55%, ${color.aqua})`,
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 22px rgba(56, 189, 248, 0.45))',
            }}
          >
            esotk.com
          </div>
        </div>
        <div style={{ marginTop: p ? 26 : 16 }}>
          <SubText
            text="Paste any ESO Logs report link to start. Free, with no ads."
            start={cues.logoHit + 52 - FROM}
            size={p ? 32 : 28}
            align="center"
            maxWidth={p ? 820 : 1200}
          />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: p ? 420 : 56,
          textAlign: 'center',
          fontFamily: display,
          fontSize: p ? 21 : 17,
          lineHeight: 1.45,
          color: color.faint,
          opacity: legal,
          padding: '0 80px',
        }}
      >
        ESO Toolkit is an independent fan project. It is not affiliated with or endorsed by ESO
        Logs, Archon, ZeniMax Online Studios or Bethesda.
      </div>
    </AbsoluteFill>
  );
};
