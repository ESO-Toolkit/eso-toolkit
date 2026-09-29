import React from 'react';
import { Video } from '@remotion/media';
import { AbsoluteFill, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { KineticText } from '../components/KineticText';
import { useStage } from '../layout';
import { clamp, easeIn, easeOut, tween } from '../lib/anim';
import timeline from '../timeline.json';
import { color, display, tooltipFace } from '../theme';

const { cues } = timeline;
const END = timeline.scenes.hook.to;

// Eases out with a long tail so the last few percent of the health bar crawl.
const drainEase = (t: number) => 1 - Math.pow(1 - t, 2.4);

/** A boss health bar that drains to 4% and then the group wipes. */
const BossBar: React.FC<{ frame: number; width: number }> = ({ frame, width }) => {
  const hp = interpolate(frame, [4, cues.wipeHit - 8], [100, 4], { ...clamp, easing: drainEase });
  const hit = frame - cues.wipeHit;
  const shake = hit >= 0 && hit < 18 ? Math.sin(hit * 2.2) * (18 - hit) * 0.6 : 0;
  const flash = interpolate(hit, [0, 2, 26], [0, 1, 0], clamp);
  const appear = tween(frame, [0, 16], [0, 1]);
  return (
    <div style={{ width, translate: `${shake}px 0`, opacity: appear }}>
      <div
        style={{
          fontFamily: tooltipFace,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#d8c7a0',
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        Veteran hard mode
      </div>
      <div
        style={{
          position: 'relative',
          height: 26,
          borderRadius: 3,
          background: 'rgba(20, 6, 8, 0.9)',
          border: '1px solid rgba(214, 170, 120, 0.55)',
          boxShadow: '0 0 0 3px rgba(0,0,0,0.6), 0 10px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${hp}%`,
            background: 'linear-gradient(180deg, #e0463c, #9b1712 60%, #6d0e0b)',
            boxShadow: '0 0 24px rgba(224, 70, 60, 0.6)',
          }}
        />
        <div
          style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: flash * 0.8 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: tooltipFace,
            fontWeight: 600,
            fontSize: 20,
            color: '#fff',
            textShadow: '0 1px 2px #000',
          }}
        >
          {Math.max(4, Math.round(hp))}%
        </div>
      </div>
    </div>
  );
};

/** Abstract parse table: ranks, name pills, bars and counting numbers. Deliberately generic. */
const NumbersTable: React.FC<{ frame: number; width: number }> = ({ frame, width }) => {
  const rows = 6;
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {new Array(rows).fill(0).map((_, i) => {
        const start = 14 + i * 5;
        const inP = tween(frame, [start, start + 22], [0, 1]);
        const value = 142000 - i * 13100 - Math.floor(random(`v${i}`) * 6000);
        const shown = Math.round(value * tween(frame, [start, start + 50], [0, 1]));
        const barW = (value / 142000) * 0.62;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              height: 44,
              padding: '0 18px',
              borderRadius: 8,
              background: 'rgba(148, 163, 184, 0.06)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              opacity: inP,
              translate: `${(1 - inP) * -30}px 0`,
              fontFamily: display,
              color: '#8a94a6',
              fontSize: 20,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ width: 22, textAlign: 'right' }}>{i + 1}</span>
            <span
              style={{
                width: 150,
                height: 12,
                borderRadius: 6,
                background: 'rgba(148, 163, 184, 0.22)',
              }}
            />
            <span style={{ flex: 1, position: 'relative', height: 10 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${barW * 100 * tween(frame, [start, start + 40], [0, 1])}%`,
                  borderRadius: 5,
                  background:
                    'linear-gradient(90deg, rgba(148,163,184,0.5), rgba(148,163,184,0.25))',
                }}
              />
            </span>
            <span style={{ width: 110, textAlign: 'right', color: '#c5cbd6' }}>
              {shown.toLocaleString('en-US')}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = useStage();
  const p = stage.portrait;
  const cx = stage.width / 2;

  const part1Out = tween(frame, [cues.hookLine2 - 14, cues.hookLine2 + 4], [0, 1], easeIn);
  const part2Out = tween(frame, [cues.hookLine3 - 14, cues.hookLine3 + 4], [0, 1], easeIn);
  const glimpse = tween(frame, [cues.hookLine3 - 6, cues.hookLine3 + 40], [0, 1]);
  const exit = tween(frame, [END - 26, END], [0, 1], easeIn);
  const desat = interpolate(frame - cues.wipeHit, [0, 4, 40], [0, 1, 0.6], clamp) * (1 - part1Out);

  const size = p ? 76 : 96;
  const barW = p ? 820 : 980;
  const tableW = p ? 900 : 1100;

  return (
    <AbsoluteFill>
      {/* Part 1: the wipe. */}
      <AbsoluteFill style={{ opacity: 1 - part1Out, filter: `saturate(${1 - desat * 0.7})` }}>
        <div style={{ position: 'absolute', left: cx - barW / 2, top: p ? 700 : 330 }}>
          <BossBar frame={frame} width={barW} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: p ? 860 : 470,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <KineticText text="Wiped at 4%." start={cues.wipeHit - 4} size={size} align="center" />
        </div>
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(200, 30, 30, 0.35), transparent 70%)',
            opacity: interpolate(frame - cues.wipeHit, [0, 3, 40], [0, 1, 0], clamp),
          }}
        />
      </AbsoluteFill>

      {/* Part 2: the numbers. */}
      <AbsoluteFill style={{ opacity: (frame >= cues.hookLine2 - 4 ? 1 : 0) * (1 - part2Out) }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: p ? 560 : 176,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <KineticText
            text="ESO Logs has the numbers."
            start={cues.hookLine2}
            size={size * 0.86}
            align="center"
            maxWidth={p ? 900 : 1500}
          />
        </div>
        <div style={{ position: 'absolute', left: cx - tableW / 2, top: p ? 820 : 380 }}>
          <NumbersTable frame={frame - cues.hookLine2} width={tableW} />
        </div>
      </AbsoluteFill>

      {/* Part 3: the fight itself, glimpsed behind the line. */}
      <AbsoluteFill style={{ opacity: glimpse * (1 - exit) }}>
        <AbsoluteFill
          style={{
            scale: `${1.14 - glimpse * 0.06 + exit * 0.25}`,
            filter: `blur(${(1 - glimpse) * 16 + 3 + exit * 20}px) brightness(0.55) saturate(0.9)`,
          }}
        >
          <Video
            src={staticFile('captures/replay.mp4')}
            trimBefore={500}
            muted
            objectFit="cover"
            disallowFallbackToOffthreadVideo
            style={{ width: '100%', height: '100%' }}
          />
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, rgba(5,8,16,0.2), ${color.void} 85%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: p ? 820 : 470,
            display: 'flex',
            justifyContent: 'center',
            opacity: 1 - exit,
            scale: `${1 + exit * 0.08}`,
          }}
        >
          <KineticText
            text="ESO Toolkit shows you the fight."
            start={cues.hookLine3}
            size={size * 0.86}
            align="center"
            maxWidth={p ? 860 : 1600}
          />
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: '#ffffff',
          opacity: interpolate(frame, [END - 6, END - 1], [0, 0.08], { ...clamp, easing: easeOut }),
        }}
      />
    </AbsoluteFill>
  );
};
