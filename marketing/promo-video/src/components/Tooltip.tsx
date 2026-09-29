import React from 'react';
import { interpolate, interpolateColors } from 'remotion';
import { clamp, easeOut } from '../lib/anim';
import { quality, tooltipFace, type Tier } from '../theme';

export const REPORT_LINES = [
  'Damage, healing and buff tables',
  'Rankings and parses',
  'Top-down replay',
];

/** Height of the three report lines at width 428. */
const BASE_H = 3 * 21 * 1.45;

/** Approximate rendered card height at width 428, used to centre effects on it. */
export const tooltipHeight = (showBase: number): number => 266 + (BASE_H + 18) * showBase;

export const SET_BONUSES = [
  { count: '(1 item)', text: 'Fight insights at a glance' },
  { count: '(2 items)', text: '3D fight replay' },
  { count: '(3 items)', text: 'Builds and scribing, decoded' },
];

type Props = {
  width: number;
  tier: Tier;
  prevTier: Tier;
  /** Frames since the tier last changed. Large when no upgrade is in flight. */
  sinceUpgrade: number;
  /** Set bonus lines lit so far (0-3). */
  activeBonuses: number;
  /** Entrance progress, 0-1. */
  appear?: number;
  equipped?: boolean;
  showPrice?: boolean;
  /** 0-1: how much of the report's own feature list is shown (folded away when docked in 9:16). */
  showBase?: number;
};

const Divider: React.FC<{ tint: string; k: number }> = ({ tint, k }) => (
  <div style={{ position: 'relative', height: 10 * k, margin: `${12 * k}px 0 ${14 * k}px` }}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 4.5 * k,
        height: Math.max(1, 1.2 * k),
        background: `linear-gradient(90deg, transparent, ${tint} 30%, ${tint} 70%, transparent)`,
        opacity: 0.75,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        width: 10 * k,
        height: 10 * k,
        marginLeft: -5 * k,
        rotate: '45deg',
        background: tint,
        boxShadow: `0 0 ${10 * k}px ${tint}`,
      }}
    />
  </div>
);

const Coin: React.FC<{ k: number }> = ({ k }) => (
  <span
    style={{
      display: 'inline-block',
      width: 16 * k,
      height: 16 * k,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #fff3b0, #eeca2a 45%, #9a7410 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
      verticalAlign: '-0.12em',
      marginRight: 7 * k,
    }}
  />
);

/**
 * An Elder Scrolls Online style item tooltip. The item is "your ESO Logs report"; each ESO
 * Toolkit feature raises its quality one step and lights one line of the set bonus.
 */
export const Tooltip: React.FC<Props> = ({
  width,
  tier,
  prevTier,
  sinceUpgrade: s,
  activeBonuses,
  appear = 1,
  equipped = false,
  showPrice = false,
  showBase = 1,
}) => {
  const k = width / 428;
  const cur = quality[tier];
  const prev = quality[prevTier];
  const tint = interpolateColors(s, [0, 14], [prev.hex, cur.hex]);
  const flash = interpolate(s, [0, 2, 24], [0, 0.55, 0], clamp);
  const shineX = interpolate(s, [2, 38], [-70, 170], { ...clamp, easing: easeOut });
  const scale = interpolate(s, [0, 5, 18, 32], [1, 1.055, 0.996, 1], clamp);
  const nameOut = interpolate(s, [0, 10], [0, 1], clamp);
  const nameIn = interpolate(s, [3, 16], [0, 1], { ...clamp, easing: easeOut });
  const upgrading = s < 40 && prevTier !== tier;

  return (
    <div
      style={{
        width,
        position: 'relative',
        fontFamily: tooltipFace,
        opacity: Math.min(1, appear * 1.4),
        scale: `${(0.94 + 0.06 * appear) * scale}`,
        translate: `0 ${(1 - appear) * 14}px`,
        filter: appear < 0.98 ? `blur(${(1 - appear) * 6}px)` : undefined,
      }}
    >
      {equipped ? (
        <div
          style={{
            fontSize: 17 * k,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: '#9ca3af',
            textTransform: 'uppercase',
            marginBottom: 8 * k,
            textAlign: 'center',
          }}
        >
          Equipped
        </div>
      ) : null}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 6 * k,
          padding: `${20 * k}px ${26 * k}px ${22 * k}px`,
          background: 'linear-gradient(180deg, rgba(14, 17, 25, 0.95), rgba(7, 9, 14, 0.96))',
          border: `1px solid rgba(255, 255, 255, 0.09)`,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 ${24 * k}px ${70 * k}px rgba(0, 0, 0, 0.55), 0 0 ${60 * k}px ${tint}33`,
        }}
      >
        {/* Quality edge: a lit rule along the top of the card. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 2 * k,
            background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
            boxShadow: `0 0 ${14 * k}px ${tint}`,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 17 * k,
            fontWeight: 500,
            color: '#8b95a5',
            letterSpacing: '0.03em',
          }}
        >
          <span>Combat log</span>
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              overflow: 'hidden',
              height: 21 * k,
              minWidth: 90 * k,
              textAlign: 'right',
            }}
          >
            {upgrading ? (
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  color: prev.hex,
                  translate: `0 ${-nameOut * 100}%`,
                  opacity: 1 - nameOut,
                }}
              >
                {prev.name}
              </span>
            ) : null}
            <span
              style={{
                position: 'absolute',
                right: 0,
                color: cur.hex,
                fontWeight: 600,
                translate: upgrading ? `0 ${(1 - nameIn) * 100}%` : undefined,
                opacity: upgrading ? nameIn : 1,
              }}
            >
              {cur.name}
            </span>
          </span>
        </div>
        <div
          style={{
            marginTop: 12 * k,
            textAlign: 'center',
            fontSize: 36 * k,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: '0.045em',
            textTransform: 'uppercase',
            color: tint,
            textShadow: `0 0 ${18 * k}px ${tint}55`,
          }}
        >
          Your ESO Logs report
        </div>
        <Divider tint={tint} k={k} />
        <div
          style={{
            textAlign: 'center',
            fontSize: 21 * k,
            lineHeight: 1.45,
            color: '#d4d8df',
            fontWeight: 500,
            height: BASE_H * k * showBase,
            opacity: showBase,
            overflow: 'hidden',
          }}
        >
          {REPORT_LINES.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 18 * k * showBase,
            textAlign: 'center',
            fontSize: 17 * k,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: activeBonuses > 0 ? tint : '#6b7280',
          }}
        >
          ESO Toolkit set ({activeBonuses}/3 items)
        </div>
        <div
          style={{
            marginTop: 6 * k,
            textAlign: 'center',
            fontSize: 20 * k,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          {SET_BONUSES.map((b, i) => {
            const lit = i < activeBonuses;
            const fresh = lit && i === activeBonuses - 1 && upgrading;
            const sweep = fresh
              ? interpolate(s, [4, 30], [-10, 110], { ...clamp, easing: easeOut })
              : -20;
            return (
              <div
                key={b.text}
                style={{
                  position: 'relative',
                  color: lit
                    ? i === activeBonuses - 1
                      ? tint
                      : quality[(i + 1) as Tier].hex
                    : '#4b5563',
                }}
              >
                {fresh ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: `${2 * k}px ${-8 * k}px`,
                      background: `linear-gradient(90deg, transparent ${sweep - 25}%, ${tint}40 ${sweep}%, transparent ${sweep + 25}%)`,
                      borderRadius: 4 * k,
                    }}
                  />
                ) : null}
                <span style={{ position: 'relative', opacity: lit ? 0.75 : 1 }}>{b.count} </span>
                <span style={{ position: 'relative' }}>{b.text}</span>
              </div>
            );
          })}
        </div>
        {showPrice ? (
          <div
            style={{
              marginTop: 16 * k,
              paddingTop: 12 * k,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 19 * k,
              color: '#c9ced6',
              fontWeight: 500,
            }}
          >
            <span>No ads. Nothing to install.</span>
            <span style={{ color: '#f5e6a8', fontWeight: 600 }}>
              <Coin k={k} />
              Free
            </span>
          </div>
        ) : null}
        {/* Upgrade light: a white flash, then a diagonal sheen crossing the card. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            opacity: flash,
            pointerEvents: 'none',
          }}
        />
        {upgrading ? (
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              bottom: '-20%',
              width: '38%',
              left: `${shineX}%`,
              rotate: '18deg',
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.28), ${tint}55, transparent)`,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
