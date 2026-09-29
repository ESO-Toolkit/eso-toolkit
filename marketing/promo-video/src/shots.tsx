import React from 'react';
import { interpolate } from 'remotion';
import { Cursor } from './components/Cursor';
import type { Shot } from './components/Screen';
import { clamp } from './lib/anim';
import timeline from './timeline.json';
import { color, quality } from './theme';

const { cues } = timeline;
const STILL: [number, number] = [3840, 2160];
const REPORT = '/report/F4f2bMwWtgVKxjB9';
const FIGHT = `${REPORT}/fight/39`;

// The pasted URL occupies this strip of the input in the 2x home capture.
const TEXT = { x: 1432, y: 1226, w: 640, h: 74 };
const ANALYZE = { x: 2118, y: 1200, w: 400, h: 128 };

/** Reveals the pasted address left to right, with a caret, then presses Analyze Log. */
const typingOverlay: Shot['overlay'] = (map, local) => {
  const start = cues.typeStart - cues.itemToHud;
  const end = cues.typeEnd - cues.itemToHud;
  const click = cues.click - cues.itemToHud;
  const typed = interpolate(local, [start, end], [0, 1], clamp);
  // Step the reveal per character so it reads as typing rather than a wipe.
  const chars = 37;
  const stepped = Math.floor(typed * chars) / chars;
  const text = map(TEXT);
  const coverX = text.x + text.w * stepped;
  const caretOn = local < end + 30 && Math.floor(local / 16) % 2 === 0;
  const btn = map(ANALYZE);
  const press = interpolate(local, [click - 3, click, click + 14], [0, 1, 0], clamp);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: coverX,
          top: text.y,
          width: text.x + text.w - coverX + 4,
          height: text.h,
          background: color.navy,
        }}
      />
      {local >= start - 20 && caretOn ? (
        <div
          style={{
            position: 'absolute',
            left: coverX + 1,
            top: text.y + text.h * 0.2,
            width: 2,
            height: text.h * 0.6,
            background: color.text,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: btn.x,
          top: btn.y,
          width: btn.w,
          height: btn.h,
          borderRadius: 14,
          background: '#ffffff',
          opacity: press * 0.35,
          boxShadow: `0 0 ${60 * press}px ${color.aqua}`,
        }}
      />
      <Cursor
        frame={local}
        appearAt={end + 6}
        clickAt={click}
        path={[
          { at: end + 6, x: text.x + text.w * 0.55, y: text.y + text.h * 2.6 },
          { at: click - 8, x: btn.x + btn.w * 0.55, y: btn.y + btn.h * 0.55 },
        ]}
      />
    </>
  );
};

export const shots: Shot[] = [
  {
    src: 'captures/home-filled.png',
    size: STILL,
    from: cues.itemToHud,
    url: '/',
    keys: [
      { at: 0, crop: { x: 0, y: 60, w: 3840, h: 2037 } },
      { at: 56, crop: { x: 1010, y: 800, w: 1860, h: 987 } },
      { at: 210, crop: { x: 1060, y: 820, w: 1780, h: 944 } },
    ],
    // Width-fit in 9:16 reveals more of the page; keep the site's hero title in frame.
    portraitKeys: [
      { at: 0, crop: { x: 0, y: 60, w: 3840, h: 2037 } },
      { at: 56, crop: { x: 1010, y: 730, w: 1860, h: 987 } },
      { at: 210, crop: { x: 1060, y: 725, w: 1780, h: 944 } },
    ],
    overlay: typingOverlay,
  },
  {
    src: 'captures/report-fights.png',
    size: STILL,
    from: cues.upgrade1,
    url: REPORT,
    keys: [
      { at: 0, crop: { x: 820, y: 230, w: 2200, h: 1167 } },
      { at: 126, crop: { x: 1080, y: 560, w: 1760, h: 934 } },
    ],
  },
  {
    src: 'captures/fight-insights.png',
    size: STILL,
    from: cues.insightsBeat2,
    url: FIGHT,
    keys: [
      { at: 0, crop: { x: 1040, y: 230, w: 1800, h: 955 } },
      { at: 70, crop: { x: 1060, y: 740, w: 1760, h: 934 } },
      { at: 170, crop: { x: 1070, y: 780, w: 1720, h: 912 } },
    ],
    callouts: [
      { from: 74, to: 160, rect: { x: 1132, y: 1150, w: 742, h: 548 }, tint: quality[1].hex },
    ],
  },
  {
    src: 'captures/fight-insights-2.png',
    size: STILL,
    from: cues.insightsBeat3,
    url: FIGHT,
    keys: [
      { at: 0, crop: { x: 1040, y: 520, w: 1740, h: 923 } },
      { at: 184, crop: { x: 1120, y: 600, w: 1640, h: 870 } },
    ],
    callouts: [
      { from: 36, to: 110, rect: { x: 1120, y: 1000, w: 730, h: 780 }, tint: quality[1].hex },
      { from: 112, to: 190, rect: { x: 1955, y: 1000, w: 730, h: 780 }, tint: quality[1].hex },
    ],
  },
  {
    src: 'captures/replay.mp4',
    size: [1920, 1080],
    kind: 'video',
    from: cues.upgrade2,
    url: '/report/WQ8L41tVhbFHCca2/fight/6/replay',
    trimBefore: 40,
    portraitFit: 'cover',
    // Tall crops that follow the boss through the orbit and stay above the transport bar (y > 960).
    portraitKeys: [
      { at: 0, crop: { x: 200, y: 150, w: 790, h: 810 } },
      { at: 280, crop: { x: 290, y: 160, w: 770, h: 790 } },
      { at: 560, crop: { x: 370, y: 180, w: 750, h: 770 } },
    ],
    keys: [
      { at: 0, crop: { x: 0, y: 0, w: 1820, h: 965 } },
      { at: 70, crop: { x: 0, y: 0, w: 1880, h: 950 } },
      { at: 560, crop: { x: 150, y: 70, w: 1600, h: 808 } },
    ],
  },
  {
    src: 'captures/fight-players-2.png',
    size: STILL,
    from: cues.upgrade3,
    url: `${FIGHT}/players`,
    keys: [
      { at: 0, crop: { x: 1060, y: 20, w: 1720, h: 912 } },
      { at: 150, crop: { x: 1080, y: 250, w: 1680, h: 891 } },
    ],
    callouts: [
      { from: 40, to: 96, rect: { x: 1120, y: 205, w: 580, h: 190 }, tint: quality[3].hex },
      { from: 98, to: 160, rect: { x: 1120, y: 490, w: 700, h: 140 }, tint: quality[3].hex },
    ],
  },
  {
    src: 'captures/fight-scribing.png',
    size: STILL,
    from: cues.buildsBeat2,
    url: `${FIGHT}/players`,
    keys: [
      { at: 0, crop: { x: 900, y: 760, w: 1900, h: 1008 } },
      { at: 80, crop: { x: 1000, y: 1070, w: 1560, h: 828 } },
      { at: 180, crop: { x: 1020, y: 1090, w: 1500, h: 796 } },
    ],
    callouts: [
      { from: 84, to: 176, rect: { x: 1245, y: 1548, w: 610, h: 126 }, tint: quality[3].hex },
    ],
  },
  {
    src: 'captures/build-extracted.png',
    size: STILL,
    from: cues.buildsBeat3,
    url: '/build-editor',
    keys: [
      { at: 0, crop: { x: 380, y: 120, w: 2640, h: 1401 } },
      { at: 64, crop: { x: 420, y: 150, w: 2420, h: 1284 } },
    ],
    callouts: [
      { from: 12, to: 60, rect: { x: 466, y: 190, w: 1270, h: 130 }, tint: quality[3].hex },
    ],
  },
  {
    src: 'captures/build-extracted-2.png',
    size: STILL,
    from: cues.buildsBeat3 + 64,
    url: '/build-editor',
    keys: [
      { at: 0, crop: { x: 760, y: 760, w: 2640, h: 1400 } },
      { at: 70, crop: { x: 820, y: 800, w: 2560, h: 1358 } },
    ],
  },
  {
    src: 'captures/calculator.png',
    size: STILL,
    from: cues.buildsBeat4,
    url: '/calculator',
    keys: [
      { at: 0, crop: { x: 1060, y: 260, w: 1820, h: 966 } },
      { at: 134, crop: { x: 1100, y: 1250, w: 1640, h: 870 } },
    ],
    callouts: [
      { from: 80, to: 150, rect: { x: 1150, y: 1780, w: 1540, h: 320 }, tint: quality[3].hex },
    ],
  },
];
