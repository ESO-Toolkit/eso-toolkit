import { Box, Skeleton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { BE_TOKENS } from '@/features/build-editor/theme/buildEditorTokens';

/**
 * BuildEditorSkeleton
 * Mirrors the glassmorphism bento grid layout of the real build editor
 * while the lazy-loaded chunk downloads. Heights, gaps, and paddings are
 * matched 1:1 against the real SectionCard, GlassPanel, and section content.
 */
export const BuildEditorSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── Palette — mirrors buildEditorTokens + shell colors ───────────────
  const shellBg = isDark ? 'rgb(8, 14, 26)' : 'rgb(245, 248, 252)';
  const glassBg = isDark ? BE_TOKENS.glass.bg : BE_TOKENS.glass.bgLight;
  const border = isDark ? BE_TOKENS.glass.border : BE_TOKENS.glass.borderLight;
  const shellBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.10)';
  const sk = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)';
  const skLight = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
  const accentFaint = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)';
  const accentLine = 'linear-gradient(90deg, #38bdf8, #818cf8)';
  const subtleBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)';

  // ── Shared section label style — matches the 11px uppercase labels ───
  const labelSx = { bgcolor: skLight, borderRadius: '2px' };

  // ── GlassPanel / SectionCard skeleton wrapper ────────────────────────
  const CardSkeleton = ({
    primary,
    subtle,
    gridColumn,
    gridRow,
    children,
  }: {
    primary?: boolean;
    subtle?: boolean;
    gridColumn?: string;
    gridRow?: string;
    children: React.ReactNode;
  }): React.ReactElement => (
    <Box
      sx={{
        gridColumn: isMobile ? undefined : gridColumn,
        gridRow: isMobile ? undefined : gridRow,
        background: glassBg,
        border: primary
          ? 'none'
          : `1px solid ${subtle ? subtleBorder : border}`,
        borderRadius: 3, // 24px — matches GlassPanel
        boxShadow: primary
          ? isDark
            ? '0 8px 40px rgba(0, 0, 0, 0.42), 0 1px 0 rgba(255, 255, 255, 0.06) inset'
            : '0 4px 28px rgba(15, 23, 42, 0.14), 0 1px 0 rgba(255, 255, 255, 0.90) inset'
          : subtle
            ? isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.18)'
              : '0 2px 8px rgba(15, 23, 42, 0.05)'
            : isDark
              ? BE_TOKENS.glass.shadow
              : BE_TOKENS.glass.shadowLight,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...(primary && {
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            background:
              'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.05) 50%, rgba(56, 189, 248, 0.12) 100%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
        }),
      }}
    >
      {children}
    </Box>
  );

  // ── SectionCard header — matches px:2, py:1.5, gap:1 ────────────────
  const CardHeader = ({
    primary,
    width = 80,
  }: {
    primary?: boolean;
    width?: number;
  }): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1.5,
        borderBottom: primary
          ? '1px solid rgba(56, 189, 248, 0.12)'
          : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        ...(primary && {
          backgroundImage: isDark
            ? `linear-gradient(135deg, ${accentFaint} 0%, transparent 65%)`
            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.04) 0%, transparent 65%)',
        }),
      }}
    >
      {/* Icon — 20px to match SectionCard icon fontSize:20 */}
      <Skeleton
        variant="circular"
        width={20}
        height={20}
        sx={{ bgcolor: primary ? accentFaint : sk, flexShrink: 0 }}
      />
      {/* Title — fontSize 13–14, fontWeight 700 */}
      <Skeleton
        variant="text"
        width={width}
        height={18}
        sx={{ bgcolor: primary ? accentFaint : sk }}
      />
      <Box sx={{ flex: 1 }} />
      {/* Completion dot — 6px circle */}
      <Skeleton
        variant="circular"
        width={6}
        height={6}
        sx={{ bgcolor: skLight, flexShrink: 0 }}
      />
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Section-specific content skeletons — matched to real component heights
  // ═══════════════════════════════════════════════════════════════════════

  // ── Identity: 4 IconPickerGrid rows + 3 alliance race groups ─────────
  // Real: Stack spacing={2.5}, each grid has label + grid of cells
  // IconPickerGrid cells: py:14px, px:10px, gap:8px, minHeight:62px, borderRadius:14px
  const IdentityContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Class — label + 4×2 grid */}
      <Box>
        <Skeleton variant="text" width={40} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
      {/* Role — label + 5 cells */}
      <Box>
        <Skeleton variant="text" width={80} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
      {/* Game Mode — label + 2 cells */}
      <Box>
        <Skeleton variant="text" width={70} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {[0, 1].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
      {/* Races — label + 3 alliance groups of 3 race cards each */}
      <Box>
        <Skeleton variant="text" width={85} height={12} sx={labelSx} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {['#ef4444', '#3b82f6', '#f59e0b'].map((color) => (
            <Box key={color}>
              {/* Alliance header — dot + label + line */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: `${color}55`,
                    flexShrink: 0,
                  }}
                />
                <Skeleton
                  variant="text"
                  width={90}
                  height={10}
                  sx={{ bgcolor: `${color}18` }}
                />
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    background: `${color}22`,
                  }}
                />
              </Box>
              {/* 3 race cards — py:1.25(10px), gap:6px, borderRadius:10px */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 0.75,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={52}
                    sx={{
                      borderRadius: '10px',
                      bgcolor: skLight,
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
          {/* Imperial — single full-width card */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                mb: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isDark
                    ? 'rgba(148,163,184,0.40)'
                    : 'rgba(148,163,184,0.55)',
                  flexShrink: 0,
                }}
              />
              <Skeleton
                variant="text"
                width={75}
                height={10}
                sx={{ bgcolor: skLight }}
              />
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: isDark
                    ? 'rgba(148,163,184,0.12)'
                    : 'rgba(148,163,184,0.18)',
                }}
              />
            </Box>
            <Skeleton
              variant="rounded"
              height={40}
              sx={{ borderRadius: '10px', bgcolor: skLight }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // ── Character: Attributes (3 bars) + Mundus (4-col grid) + Curse (3-col) ──
  // Real: Stack spacing={2.5}
  // AttributeBar: py:1, px:1.5, gap:1.25, borderRadius:2.5(20px), bar:h8px, buttons:36px
  const CharacterContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Attributes label + counter */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Skeleton variant="text" width={65} height={12} sx={labelSx} />
          <Skeleton variant="text" width={32} height={12} sx={labelSx} />
        </Box>
        {/* 3 attribute bars — each is ~52px tall (py:8px*2 + content) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {[
            BE_TOKENS.attributes.magicka,
            BE_TOKENS.attributes.health,
            BE_TOKENS.attributes.stamina,
          ].map((color) => (
            <Box
              key={color}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 1,
                px: 1.5,
                borderRadius: 2.5,
                background: `${color}0D`, // alpha 0.05
                border: `1px solid ${color}2E`, // alpha 0.18
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: `${color}55`,
                  flexShrink: 0,
                }}
              />
              <Skeleton
                variant="text"
                width={60}
                height={14}
                sx={{ bgcolor: `${color}18`, flexShrink: 0 }}
              />
              {/* Bar track */}
              <Box
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: `${color}1A`,
                  minWidth: 48,
                }}
              />
              {/* Minus button */}
              <Skeleton
                variant="rounded"
                width={36}
                height={36}
                sx={{ borderRadius: '8px', bgcolor: skLight, flexShrink: 0 }}
              />
              {/* Value */}
              <Skeleton
                variant="text"
                width={26}
                height={16}
                sx={{ bgcolor: skLight, flexShrink: 0 }}
              />
              {/* Plus button */}
              <Skeleton
                variant="rounded"
                width={36}
                height={36}
                sx={{
                  borderRadius: '8px',
                  bgcolor: `${color}1A`,
                  flexShrink: 0,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
      {/* Mundus Stone — label + 4-col grid (14 stones + None = ~4 rows) */}
      <Box>
        <Skeleton variant="text" width={85} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
      {/* Curse — label + 3-col grid */}
      <Box>
        <Skeleton variant="text" width={40} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  // ── Subclassing: explainer text + 3 slot picker cards ────────────────
  // Real: Stack spacing={2}, each slot is p:1.5, borderRadius:2(16px), ~48px height
  const SubclassingContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Skeleton variant="text" width={105} height={12} sx={labelSx} />
        <Skeleton
          variant="text"
          width="90%"
          height={12}
          sx={{ ...labelSx, mt: 0.5 }}
        />
        <Skeleton
          variant="text"
          width="70%"
          height={12}
          sx={{ ...labelSx, mt: 0.25 }}
        />
      </Box>
      {/* 3 slot pickers — each ~48px tall */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Skeleton
              variant="text"
              width={16}
              height={12}
              sx={{ bgcolor: skLight, flexShrink: 0 }}
            />
            <Skeleton
              variant="text"
              width={`${55 + i * 12}%`}
              height={14}
              sx={{ bgcolor: skLight, flex: 1 }}
            />
            <Skeleton
              variant="rounded"
              width={16}
              height={16}
              sx={{ borderRadius: '4px', bgcolor: skLight, flexShrink: 0 }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );

  // ── Equipment: 4 groups of slot rows ─────────────────────────────────
  // Real: Stack spacing={0.5}, GearSlotCard height ~56px each
  // Groups: Apparel(7) + Accessories(3) + Front Bar(2) + Back Bar(2)
  const EquipmentContent = (): React.ReactElement => {
    const SlotRow = (): React.ReactElement => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          py: 0.75,
          px: 1.5,
          borderRadius: 2,
          border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
          minHeight: 52,
        }}
      >
        {/* Slot SVG icon placeholder */}
        <Skeleton
          variant="rounded"
          width={36}
          height={36}
          sx={{ borderRadius: '8px', bgcolor: skLight, flexShrink: 0 }}
        />
        {/* Slot name */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="60%" height={14} sx={{ bgcolor: skLight }} />
          <Skeleton variant="text" width="35%" height={10} sx={{ bgcolor: skLight, mt: 0.25 }} />
        </Box>
        {/* Trait + enchant chips */}
        <Skeleton
          variant="rounded"
          width={44}
          height={18}
          sx={{ borderRadius: '4px', bgcolor: skLight, flexShrink: 0 }}
        />
        <Skeleton
          variant="rounded"
          width={44}
          height={18}
          sx={{ borderRadius: '4px', bgcolor: skLight, flexShrink: 0 }}
        />
      </Box>
    );

    const GroupLabel = ({ width }: { width: number }): React.ReactElement => (
      <Skeleton
        variant="text"
        width={width}
        height={10}
        sx={{
          ...labelSx,
          mt: 0.75,
          mb: 0.25,
          letterSpacing: 1.6,
        }}
      />
    );

    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <GroupLabel width={55} />
        {/* Apparel — 7 slots */}
        {Array.from({ length: 7 }).map((_, i) => (
          <SlotRow key={`a${i}`} />
        ))}
        <Box sx={{ pt: 0.75 }} />
        <GroupLabel width={72} />
        {/* Accessories — 3 slots */}
        {Array.from({ length: 3 }).map((_, i) => (
          <SlotRow key={`c${i}`} />
        ))}
        <Box sx={{ pt: 0.75 }} />
        <GroupLabel width={60} />
        {/* Front Bar — 2 slots */}
        {Array.from({ length: 2 }).map((_, i) => (
          <SlotRow key={`f${i}`} />
        ))}
        <Box sx={{ pt: 0.25 }} />
        <GroupLabel width={55} />
        {/* Back Bar — 2 slots */}
        {Array.from({ length: 2 }).map((_, i) => (
          <SlotRow key={`b${i}`} />
        ))}
      </Box>
    );
  };

  // ── Skills: 2 skill bars (5 slots + 1 ultimate) ─────────────────────
  // Real: TILE_SIZE=58, ULT_SIZE=66, gap 8px between tiles
  const SkillsContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {['Front Bar', 'Back Bar'].map((label) => (
        <Box key={label}>
          <Skeleton
            variant="text"
            width={55}
            height={10}
            sx={{ ...labelSx, mb: 0.75 }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* 5 skill tiles */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={58}
                height={58}
                sx={{ borderRadius: '14px', bgcolor: skLight, flexShrink: 0 }}
              />
            ))}
            {/* Gap before ultimate */}
            <Box sx={{ width: 6 }} />
            {/* Ultimate — slightly larger with accent tint */}
            <Skeleton
              variant="rounded"
              width={66}
              height={66}
              sx={{
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(255,179,0,0.06)' : 'rgba(255,179,0,0.04)',
                flexShrink: 0,
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );

  // ── Consumables: tab switcher + food slot ────────────────────────────
  // Real: Stack spacing={1.5}, 2 pill tabs, then food card
  const ConsumablesContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Tab switcher — 2 pill buttons */}
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <Skeleton
          variant="rounded"
          height={32}
          sx={{
            flex: 1,
            borderRadius: '99px',
            bgcolor: accentFaint,
          }}
        />
        <Skeleton
          variant="rounded"
          height={32}
          sx={{
            flex: 1,
            borderRadius: '99px',
            bgcolor: skLight,
          }}
        />
      </Box>
      {/* Food card placeholder */}
      <Skeleton
        variant="rounded"
        height={56}
        sx={{ borderRadius: '12px', bgcolor: skLight }}
      />
      <Skeleton
        variant="text"
        width="65%"
        height={12}
        sx={labelSx}
      />
    </Box>
  );

  // ── Champion Points: segmented tree selector + 4 CP slot cards + passives ──
  // Real: 3-segment tab bar (h~40px) + 4 slot cards at flex:1 1 calc(50% - 6px) minH:68px
  const ChampionContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Tree selector — 3-segment rounded bar */}
      <Box
        sx={{
          display: 'flex',
          borderRadius: 2,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
          p: '3px',
          overflow: 'hidden',
        }}
      >
        {[
          { color: '#42a5f5', label: 58 },
          { color: '#ef5350', label: 46 },
          { color: '#66bb6a', label: 38 },
        ].map(({ color }, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={34}
            sx={{
              flex: 1,
              borderRadius: '12px',
              bgcolor: i === 0 ? `${color}1A` : 'transparent',
            }}
          />
        ))}
      </Box>

      {/* Active Perks label + 4 slot cards */}
      <Box>
        <Skeleton variant="text" width={75} height={10} sx={labelSx} />
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            mt: 1,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                flex: '1 1 calc(50% - 6px)',
                minHeight: 68,
                borderRadius: 2.5,
                border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1,
              }}
            >
              {/* Rotated diamond icon */}
              <Skeleton
                variant="rounded"
                width={32}
                height={32}
                sx={{
                  borderRadius: '6px',
                  bgcolor: skLight,
                  flexShrink: 0,
                  transform: 'rotate(45deg)',
                }}
              />
              <Skeleton
                variant="text"
                width="55%"
                height={12}
                sx={{ bgcolor: skLight }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Passive Stars label + rows */}
      <Box>
        <Skeleton variant="text" width={80} height={10} sx={labelSx} />
        {/* Progress bar */}
        <Skeleton
          variant="rounded"
          height={3}
          sx={{
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            mt: 0.75,
            mb: 1,
          }}
        />
        {/* Passive rows — each ~32px */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                px: 1,
              }}
            >
              <Skeleton
                variant="text"
                width={`${40 + ((i * 17) % 35)}%`}
                height={12}
                sx={{ bgcolor: skLight, flex: 1 }}
              />
              <Skeleton
                variant="rounded"
                width={28}
                height={28}
                sx={{ borderRadius: '6px', bgcolor: skLight, flexShrink: 0 }}
              />
              <Skeleton
                variant="rounded"
                width={36}
                height={4}
                sx={{ borderRadius: 2, bgcolor: skLight, flexShrink: 0 }}
              />
              <Skeleton
                variant="text"
                width={26}
                height={10}
                sx={{ bgcolor: skLight, flexShrink: 0 }}
              />
              <Skeleton
                variant="rounded"
                width={20}
                height={20}
                sx={{ borderRadius: '6px', bgcolor: skLight, flexShrink: 0 }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  // ── Passives: grid of 44px icon tiles + "Add" button ─────────────────
  const PassivesContent = (): React.ReactElement => (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={44}
            height={44}
            sx={{ borderRadius: '10px', bgcolor: skLight }}
          />
        ))}
        {/* Add button */}
        <Skeleton
          variant="rounded"
          width={44}
          height={44}
          sx={{
            borderRadius: '10px',
            bgcolor: skLight,
            border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
      </Box>
    </Box>
  );

  // ── Stats: 4 gauge circles + buff toggles + breakdown ────────────────
  // Real: StatGauge size=80, each is 80×80 circle + label + cap text
  const StatsContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 4 gauges row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
          gap: 2,
          justifyItems: 'center',
          py: 1,
        }}
      >
        {['#f59e0b', '#f59e0b', '#f59e0b', '#f59e0b'].map((_, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 96,
            }}
          >
            <Skeleton
              variant="circular"
              width={80}
              height={80}
              sx={{ bgcolor: skLight }}
            />
            <Skeleton variant="text" width={65} height={11} sx={labelSx} />
            <Skeleton variant="text" width={50} height={9} sx={labelSx} />
          </Box>
        ))}
      </Box>
      {/* Buff toggles — collapsible, shown collapsed */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.75,
          cursor: 'pointer',
        }}
      >
        <Skeleton
          variant="rounded"
          width={16}
          height={16}
          sx={{ borderRadius: '4px', bgcolor: skLight, flexShrink: 0 }}
        />
        <Skeleton variant="text" width={110} height={14} sx={{ bgcolor: skLight }} />
      </Box>
    </Box>
  );

  // ── Guide & Media: youtube URL + guide textarea + screenshot area ─────
  // Real: Stack spacing={2.5}, TextField heights ~48px, textarea ~120px
  const GuideContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* YouTube URL input */}
      <Box>
        <Skeleton variant="text" width={70} height={12} sx={labelSx} />
        <Skeleton
          variant="rounded"
          height={48}
          sx={{
            borderRadius: '10px',
            bgcolor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.04)',
            mt: 0.75,
          }}
        />
      </Box>
      {/* Guide content textarea */}
      <Box>
        <Skeleton variant="text" width={45} height={12} sx={labelSx} />
        <Skeleton
          variant="rounded"
          height={120}
          sx={{
            borderRadius: '10px',
            bgcolor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.04)',
            mt: 0.75,
          }}
        />
      </Box>
      {/* Screenshots label */}
      <Box>
        <Skeleton variant="text" width={80} height={12} sx={labelSx} />
        <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
          <Skeleton
            variant="rounded"
            width={80}
            height={56}
            sx={{
              borderRadius: '10px',
              bgcolor: skLight,
              border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  // ── Settings: visibility picker (3-col grid) + info panel ────────────
  // Real: Stack spacing={2.5}, IconPickerGrid columns=3, info panel p:1.5
  const SettingsContent = (): React.ReactElement => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Skeleton variant="text" width={60} height={12} sx={labelSx} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            mt: 1,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={62}
              sx={{ borderRadius: '14px', bgcolor: skLight }}
            />
          ))}
        </Box>
      </Box>
      {/* Setup order info panel */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Skeleton variant="text" width={80} height={12} sx={labelSx} />
        <Skeleton
          variant="text"
          width="85%"
          height={10}
          sx={{ ...labelSx, mt: 0.5 }}
        />
      </Box>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Header — matches BuildCompletionHeader: py:1.5, px:2/3, gap:1.5/2
  // ═══════════════════════════════════════════════════════════════════════
  const HeaderSkeleton = (): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 3 },
        py: 1.5,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        backgroundColor: isDark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(248, 250, 252, 0.92)',
        backgroundImage:
          'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, transparent 55%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        rowGap: 1,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Build name + description input well */}
      <Box
        sx={{
          flex: 1,
          minWidth: 160,
          maxWidth: 480,
          background: isDark ? BE_TOKENS.input.dark.bg : BE_TOKENS.input.light.bg,
          borderRadius: '10px',
          border: `1px solid ${isDark ? BE_TOKENS.input.dark.border : BE_TOKENS.input.light.border}`,
        }}
      >
        <Skeleton
          variant="text"
          width="55%"
          height={isMobile ? 18 : 22}
          sx={{ bgcolor: skLight, mx: 1.5, mt: 1 }}
        />
        <Skeleton
          variant="text"
          width="80%"
          height={12}
          sx={{ bgcolor: skLight, mx: 1.5, mb: 0.75 }}
        />
      </Box>

      {/* Class + completion badge */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          borderRadius: '10px',
          overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
          height: 36,
        }}
      >
        <Skeleton
          variant="text"
          width={65}
          height={14}
          sx={{ bgcolor: accentFaint, mx: 1.5 }}
        />
        <Box
          sx={{
            width: 42,
            height: '100%',
            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Skeleton variant="text" width={28} height={14} sx={{ bgcolor: skLight }} />
        </Box>
      </Box>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, md: 1 },
          ml: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Import/Export segment */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              overflow: 'hidden',
            }}
          >
            <Skeleton
              variant="rectangular"
              width={34}
              height={34}
              sx={{ bgcolor: skLight }}
            />
            <Skeleton
              variant="rectangular"
              width={34}
              height={34}
              sx={{ bgcolor: skLight }}
            />
          </Box>
        )}
        {/* Save, Share, Publish pills */}
        {(isMobile ? [36, 36, 36] : [75, 80, 85]).map((w, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={w}
            height={34}
            sx={{ borderRadius: '99px', bgcolor: i === 2 ? accentFaint : sk }}
          />
        ))}
        {/* More menu */}
        <Skeleton
          variant="circular"
          width={34}
          height={34}
          sx={{ bgcolor: skLight }}
        />
      </Box>
    </Box>
  );

  // ── Nav Rail — matches BuildNavRail: width:164, grouped items ─────────
  const NavRailSkeleton = (): React.ReactElement => (
    <Box
      sx={{
        width: BE_TOKENS.navRail.width,
        flexShrink: 0,
        pt: 2,
        px: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {[
        { label: 45, items: 3 },  // Build
        { label: 50, items: 3 },  // Loadout
        { label: 72, items: 3 },  // Progression
        { label: 48, items: 2 },  // Details
      ].map((group, gi) => (
        <Box key={gi}>
          {/* Group label — 9px uppercase */}
          <Skeleton
            variant="text"
            width={group.label}
            height={9}
            sx={{ ...labelSx, mb: 0.75, ml: 1 }}
          />
          {/* Items — each has icon(18px) + label + completion dot */}
          {Array.from({ length: group.items }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.625,
                borderRadius: '8px',
              }}
            >
              <Skeleton
                variant="circular"
                width={18}
                height={18}
                sx={{ bgcolor: skLight, flexShrink: 0 }}
              />
              <Skeleton
                variant="text"
                width={60 + ((i * 17) % 35)}
                height={13}
                sx={{ bgcolor: skLight }}
              />
              <Box sx={{ flex: 1 }} />
              <Skeleton
                variant="circular"
                width={5}
                height={5}
                sx={{ bgcolor: skLight, flexShrink: 0 }}
              />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );

  // ── Setup Tab Bar — matches SetupTabBar: px:2, py:1.5 ────────────────
  const SetupTabBarSkeleton = (): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1.25,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Active tab */}
      <Skeleton
        variant="rounded"
        width={90}
        height={34}
        sx={{ borderRadius: '10px', bgcolor: accentFaint }}
      />
      {/* Inactive tab */}
      <Skeleton
        variant="rounded"
        width={90}
        height={34}
        sx={{ borderRadius: '10px', bgcolor: skLight }}
      />
      {/* Add button */}
      <Skeleton
        variant="circular"
        width={30}
        height={30}
        sx={{ bgcolor: skLight }}
      />
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Main render — shell + layout composition
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        border: `1px solid ${shellBorder}`,
        backgroundColor: shellBg,
        backgroundImage: isDark
          ? [
              'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 45%)',
              'radial-gradient(ellipse at 88% 12%, rgba(56, 189, 248, 0.04) 0%, transparent 35%)',
            ].join(', ')
          : 'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.05) 0%, transparent 45%)',
        overflow: 'clip',
        minHeight: 600,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accentLine,
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 2,
        },
      }}
    >
      <Box
        component="main"
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}
      >
        <HeaderSkeleton />

        <Box
          sx={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            flexDirection: 'row',
          }}
        >
          {!isMobile && <NavRailSkeleton />}

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              p: { xs: 1.5, md: 2.5 },
              pb: isMobile ? 10 : 2.5,
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2, md: 2.5, lg: 3 },
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gridAutoFlow: isMobile ? undefined : 'dense',
              }}
            >
              {/* Identity (primary) */}
              <CardSkeleton primary>
                <CardHeader primary width={55} />
                <IdentityContent />
              </CardSkeleton>

              {/* Character */}
              <CardSkeleton>
                <CardHeader width={68} />
                <CharacterContent />
              </CardSkeleton>

              {/* Subclassing */}
              <CardSkeleton>
                <CardHeader width={85} />
                <SubclassingContent />
              </CardSkeleton>

              {/* Equipment (primary, spans 2 rows) */}
              <CardSkeleton primary gridRow="span 2">
                <CardHeader primary width={75} />
                <EquipmentContent />
              </CardSkeleton>

              {/* Skills (primary) */}
              <CardSkeleton primary>
                <CardHeader primary width={42} />
                <SkillsContent />
              </CardSkeleton>

              {/* Consumables */}
              <CardSkeleton>
                <CardHeader width={88} />
                <ConsumablesContent />
              </CardSkeleton>

              {/* Champion Points (primary, full width) */}
              <CardSkeleton primary gridColumn="span 2">
                <CardHeader primary width={118} />
                <ChampionContent />
              </CardSkeleton>

              {/* Passives */}
              <CardSkeleton>
                <CardHeader width={60} />
                <PassivesContent />
              </CardSkeleton>

              {/* Stats (primary, full width) */}
              <CardSkeleton primary gridColumn="span 2">
                <CardHeader primary width={38} />
                <StatsContent />
              </CardSkeleton>

              {/* Guide & Media (full width) */}
              <CardSkeleton gridColumn="span 2">
                <CardHeader width={100} />
                <GuideContent />
              </CardSkeleton>

              {/* Settings (subtle, full width) */}
              <CardSkeleton subtle gridColumn="span 2">
                <CardHeader width={60} />
                <SettingsContent />
              </CardSkeleton>
            </Box>
          </Box>
        </Box>

        <SetupTabBarSkeleton />

        {/* Mobile bottom nav */}
        {isMobile && (
          <Box
            sx={{
              height: BE_TOKENS.navRail.mobileHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              px: 2,
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="circular"
                width={28}
                height={28}
                sx={{ bgcolor: skLight }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
