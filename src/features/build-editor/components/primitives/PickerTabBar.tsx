/**
 * PickerTabBar — reusable tab button for picker dialog tab bars.
 *
 * Provides consistent styling, keyboard navigation (arrow keys),
 * and optional color theming per tab.
 */

import { Box, ButtonBase } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useRef } from 'react';

// ── Single Tab ──────────────────────────────────────────────────────────────

interface PickerTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  /** Optional accent color for active state */
  color?: string;
  /** For keyboard navigation */
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  innerRef?: React.Ref<HTMLButtonElement>;
}

export const PickerTab: React.FC<PickerTabProps> = ({
  label,
  isActive,
  onClick,
  color,
  tabIndex,
  onKeyDown,
  innerRef,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  const activeColor = color ?? (isDark ? '#fff' : '#0f172a');
  const activeBg = color ? `${color}18` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const activeBorder = color
    ? `${color}35`
    : isDark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.10)';

  return (
    <ButtonBase
      ref={innerRef}
      onClick={onClick}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      role="tab"
      aria-selected={isActive}
      sx={{
        px: 1.25,
        py: 0.5,
        borderRadius: 1.5,
        fontSize: 11,
        fontWeight: isActive ? 700 : 500,
        fontFamily: 'Space Grotesk, Inter, system-ui',
        letterSpacing: 0.3,
        flexShrink: 0,
        color: isActive ? activeColor : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
        background: isActive ? activeBg : 'transparent',
        border: `1px solid ${isActive ? activeBorder : 'transparent'}`,
        transition: 'all 0.15s ease',
        '&:hover': {
          background: isActive ? activeBg : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        },
        '&:focus-visible': {
          outline: `2px solid ${color ?? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.6)'}`,
          outlineOffset: -2,
        },
      }}
    >
      {label}
    </ButtonBase>
  );
};

// ── Tab Bar with keyboard navigation ────────────────────────────────────────

interface PickerTabBarProps<T extends string | number> {
  tabs: { key: T; label: string; color?: string }[];
  activeKey: T;
  onChange: (key: T) => void;
}

export function PickerTabBar<T extends string | number>({
  tabs,
  activeKey,
  onChange,
}: PickerTabBarProps<T>): React.ReactElement {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        next = tabs.length - 1;
      }
      if (next >= 0) {
        tabRefs.current[next]?.focus();
        onChange(tabs[next].key);
      }
    },
    [tabs, onChange],
  );

  return (
    <Box role="tablist" sx={{ display: 'contents' }}>
      {tabs.map((tab, i) => {
        const isActive = tab.key === activeKey;
        return (
          <PickerTab
            key={tab.key}
            label={tab.label}
            isActive={isActive}
            onClick={() => onChange(tab.key)}
            color={tab.color}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, i)}
            innerRef={(el) => {
              tabRefs.current[i] = el;
            }}
          />
        );
      })}
    </Box>
  );
}
