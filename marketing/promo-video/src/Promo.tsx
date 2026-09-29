import { Audio } from '@remotion/media';
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Background, Grain, Vignette } from './components/Background';
import { KineticText, SubText } from './components/KineticText';
import { LightLeak } from './components/LightLeak';
import { Screen } from './components/Screen';
import { Tooltip, tooltipHeight } from './components/Tooltip';
import { UpgradeBurst } from './components/UpgradeBurst';
import { useStage, type Stage } from './layout';
import { clamp, easeIn, easeInOut, lerpRect, settle, tween, type Rect } from './lib/anim';
import { Cta } from './scenes/Cta';
import { Hook } from './scenes/Hook';
import { shots } from './shots';
import timeline from './timeline.json';
import { quality, type Tier } from './theme';

const { cues, scenes } = timeline;
const UPGRADES = [cues.upgrade1, cues.upgrade2, cues.upgrade3];

type Copy = { title: string; sub?: string; start: number; end: number };

// On-screen copy. Every claim here was checked against the live site and the codebase.
const HEADLINES: Copy[] = [
  {
    title: 'Paste the same link into ESO Toolkit.',
    sub: 'Nothing to install and nothing to re-upload.',
    start: 440,
    end: 694,
  },
  {
    title: 'See what your group actually ran.',
    sub: 'Key ultimates, champion points, and buff and debuff uptimes for every pull.',
    start: 736,
    end: 1186,
  },
  {
    title: 'Every build, decoded.',
    sub: 'Gear, skills, champion points and scribed scripts, read straight from the log.',
    start: 1816,
    end: 2118,
  },
  {
    title: 'Then take it into the editor.',
    sub: 'Extract any build, then check the math with penetration, crit and ultimate calculators.',
    start: 2140,
    end: 2386,
  },
];

const Headline: React.FC<{
  copy: Copy;
  stage: Stage;
  x?: number;
  y?: number;
  align?: 'left' | 'center';
  w?: number;
}> = ({
  copy,
  stage,
  x = stage.headline.x,
  y = stage.headline.y,
  align = 'left',
  w = stage.headline.w,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
    }}
  >
    <KineticText
      text={copy.title}
      start={copy.start}
      end={copy.end}
      size={stage.headline.size}
      align={align}
      maxWidth={w}
    />
    {copy.sub ? (
      <div style={{ marginTop: stage.portrait ? 22 : 14 }}>
        <SubText
          text={copy.sub}
          start={copy.start + 12}
          end={copy.end}
          size={stage.headline.subSize}
          maxWidth={Math.min(w, stage.portrait ? 900 : 1200)}
          align={align}
        />
      </div>
    ) : null}
  </div>
);

/** Where the persistent footage frame sits at a given frame. */
const screenBox = (f: number, stage: Stage): Rect => {
  const toWide = interpolate(f, [cues.upgrade2 + 30, cues.upgrade2 + 74], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const toDock = interpolate(f, [cues.replayOut, cues.replayOut + 40], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const wide = toWide * (1 - toDock);
  return lerpRect(stage.screen, stage.screenWide, wide);
};

/** Where the persistent tooltip sits (top-left corner, width, scale) at a given frame. */
const tooltipPlacement = (f: number, fps: number, stage: Stage) => {
  const hero = stage.tooltipHero;
  const dock = stage.tooltip;
  const summaryRight = stage.compare.upgraded;
  const toDock = settle(f, cues.itemToHud, fps, 46);
  const toSummary = settle(f, cues.summaryIn + 10, fps, 50);
  const outForReplay = interpolate(f, [cues.upgrade2 + 40, cues.upgrade2 + 76], [0, 1], {
    ...clamp,
    easing: easeIn,
  });
  const backFromReplay = interpolate(f, [cues.replayOut + 4, cues.replayOut + 44], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const away = outForReplay * (1 - backFromReplay);

  let x = hero.x + (dock.x - hero.x) * toDock;
  let y = hero.y + (dock.y - hero.y) * toDock;
  let w = hero.w + (dock.w - hero.w) * toDock;
  let scale = hero.scale + (1 - hero.scale) * toDock;
  x += away * (stage.portrait ? 0 : 640);
  y += away * (stage.portrait ? 900 : 0);
  x += (summaryRight.x - x) * toSummary;
  y += (summaryRight.y - y) * toSummary;
  w += (summaryRight.w - w) * toSummary;
  scale += (summaryRight.scale - scale) * toSummary;
  // In 9:16 the docked card folds its report lines away and unfolds them for the comparison.
  const showBase = stage.compactDock ? Math.min(1, Math.max(0, 1 - toDock + toSummary)) : 1;
  return { x, y, w, scale, showBase, opacity: 1 - away * 0.9 };
};

export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stage = useStage();

  const tier = UPGRADES.filter((u) => f >= u).length as Tier;
  const prevTier = Math.max(0, tier - 1) as Tier;
  const since = tier === 0 ? 9999 : f - UPGRADES[tier - 1];
  const q = quality[tier];

  const tipAppear = settle(f, scenes.item.from + 4, fps, 40);
  const tipExit = tween(f, [scenes.cta.from - 22, scenes.cta.from + 6], [0, 1], easeIn);
  const tip = tooltipPlacement(f, fps, stage);
  const tipH = tooltipHeight(tip.showBase) * (tip.w / 428) * tip.scale;

  const screenAppear = settle(f, cues.itemToHud + 6, fps, 44);
  const screenExit = tween(f, [scenes.summary.from - 6, scenes.summary.from + 26], [0, 1], easeIn);
  const box = screenBox(f, stage);

  const equippedAppear = settle(f, cues.compareIn, fps, 40);
  const summaryOut = tween(f, [scenes.cta.from - 22, scenes.cta.from + 6], [0, 1], easeIn);
  const tintAlpha = tier > 0 ? interpolate(since, [0, 4, 56], [0, 0.4, 0], clamp) : 0;

  const replayCopy: Copy = {
    title: 'Rewatch the pull in 3D.',
    sub: 'Orbit the arena, follow any player and draw the plan on the map.',
    start: cues.upgrade2 + 84,
    end: cues.replayOut - 24,
  };
  const replayScrim =
    tween(f, [cues.upgrade2 + 60, cues.upgrade2 + 100], [0, 1]) *
    (1 - tween(f, [cues.replayOut - 20, cues.replayOut + 6], [0, 1]));

  return (
    <AbsoluteFill style={{ backgroundColor: '#050810' }}>
      <Background tint={q.hex} tintAlpha={tintAlpha} />

      <Sequence durationInFrames={scenes.hook.to + 2} name="Hook">
        <Hook />
      </Sequence>

      {/* Item scene: introduce the report as an item. */}
      <Sequence
        from={scenes.item.from}
        durationInFrames={scenes.item.to - scenes.item.from}
        name="Item"
        layout="none"
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: stage.portrait ? 380 : 90,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <KineticText
            text="You already have the log."
            start={14}
            end={cues.itemToHud - scenes.item.from - 18}
            size={stage.headline.size}
            align="center"
          />
        </div>
      </Sequence>

      {f >= cues.itemToHud && f < scenes.summary.to ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 1 - screenExit,
            scale: `${1 - screenExit * 0.06}`,
          }}
        >
          <Screen box={box} shots={shots} appear={screenAppear} portrait={stage.portrait} />
          {replayScrim > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: box.x,
                top: box.y + box.h * 0.42,
                width: box.w,
                height: box.h * 0.58,
                borderRadius: '0 0 16px 16px',
                // Fade via the gradient's alpha, not layer opacity: an opacity-animated gradient layer
                // leaves a hard tile seam in Chrome's GPU compositor on some frames.
                background: `linear-gradient(180deg, rgba(3, 6, 14, 0), rgba(3, 6, 14, ${0.72 * replayScrim}) 45%, rgba(3, 6, 14, ${0.94 * replayScrim}))`,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {HEADLINES.map((copy) =>
        f >= copy.start - 2 && f <= copy.end + 30 ? (
          <Headline key={copy.title} copy={copy} stage={stage} />
        ) : null,
      )}
      {f >= replayCopy.start - 2 && f <= replayCopy.end + 30 ? (
        <Headline
          copy={replayCopy}
          stage={stage}
          x={box.x + (stage.portrait ? 48 : 64)}
          y={box.y + box.h - (stage.portrait ? 250 : 210)}
          w={box.w - 128}
        />
      ) : null}

      {/* Summary: ESO's own item comparison, Equipped on the left. */}
      {f >= cues.compareIn && f < scenes.cta.from + 8 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: stage.compare.headlineY,
              display: 'flex',
              justifyContent: 'center',
              opacity: 1 - summaryOut,
            }}
          >
            <KineticText
              text="Same log. More to see."
              start={cues.compareIn + 4}
              end={scenes.cta.from - 26}
              size={stage.headline.size * 1.05}
              align="center"
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: stage.compare.equipped.x,
              top: stage.compare.equipped.y,
              opacity: 1 - summaryOut,
              scale: `${1 - summaryOut * 0.08}`,
              transformOrigin: stage.portrait ? '50% 0' : '100% 0',
              filter: 'saturate(0.85) brightness(0.92)',
            }}
          >
            <Tooltip
              width={stage.compare.equipped.w}
              tier={0}
              prevTier={0}
              sinceUpgrade={9999}
              activeBonuses={0}
              appear={equippedAppear}
              equipped
            />
          </div>
        </>
      ) : null}

      {/* The item itself, persistent from its introduction until the end card. */}
      {f >= scenes.item.from && f < scenes.cta.from + 8 ? (
        <div
          style={{
            position: 'absolute',
            left: tip.x,
            top: tip.y,
            opacity: tip.opacity * (1 - tipExit),
            scale: `${tip.scale * (1 - tipExit * 0.08)}`,
            transformOrigin: '0 0',
          }}
        >
          <Tooltip
            width={tip.w}
            tier={tier}
            prevTier={prevTier}
            sinceUpgrade={since}
            activeBonuses={tier}
            appear={tipAppear}
            showPrice={f >= cues.compareIn + 20}
            showBase={tip.showBase}
          />
        </div>
      ) : null}

      {UPGRADES.map((u, i) => (
        <UpgradeBurst
          key={u}
          x={tip.x + (tip.w * tip.scale) / 2}
          y={tip.y + tipH * 0.42}
          since={f - u}
          hex={quality[i + 1].hex}
          rgb={quality[i + 1].rgb}
          intensity={i === 2 ? 1.6 : 1}
          seed={`u${i}`}
        />
      ))}

      <LightLeak at={cues.upgrade3 - 6} duration={84} seed={3} strength={0.3} />
      <LightLeak at={cues.logoHit - 8} duration={96} hueShift={185} seed={7} strength={0.22} />

      <Sequence from={scenes.cta.from} name="End card">
        <Cta />
      </Sequence>

      <Vignette />
      <Grain />
      <Audio src={staticFile('audio/soundtrack.wav')} />
    </AbsoluteFill>
  );
};
