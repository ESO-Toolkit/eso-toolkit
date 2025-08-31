import { useTheme } from '@mui/material';
import React from 'react';

// Dark mode role colors (original)
export const DARK_ROLE_COLORS = {
  dps: '#ff8b61', // Orange for DPS
  healer: '#b970ff', // Purple for Healer
  tank: '#62baff', // Blue for Tank
} as const;

// Light mode role colors with vibrant gradients
export const LIGHT_ROLE_COLORS = {
  dps: 'linear-gradient(135deg, #ff9246d9 56% 56%, #ff000078 100%)',
  healer: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
  tank: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
} as const;

// Light mode role colors for solid color fallbacks
export const LIGHT_ROLE_COLORS_SOLID = {
  dps: '#ff5722', // Material orange
  healer: '#7c3aed', // Vibrant purple
  tank: '#0891b2', // Electric blue
} as const;

export const ROLE_COLORS = DARK_ROLE_COLORS; // Keep for backward compatibility

type Role = 'dps' | 'healer' | 'tank';

export const getRoleColor = (role: Role, isDarkMode = true): string => {
  const colors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS;
  return colors[role] || '#9e9e9e'; // Default to gray if role not found
};

// Get solid color for cases where gradients can't be used (like progress bars)
export const getRoleColorSolid = (role: Role, isDarkMode = true): string => {
  const colors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
  return colors[role] || '#9e9e9e'; // Default to gray if role not found
};

interface RoleIndicatorProps {
  role: Role;
}

export const RoleIndicator: React.FC<RoleIndicatorProps> = ({ role }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return React.createElement('span', {
    style: {
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: getRoleColorSolid(role, isDarkMode),
      border: `2px solid ${isDarkMode ? 'white' : '#f1f5f9'}`,
      boxShadow: isDarkMode 
        ? '0 0 4px rgba(0, 0, 0, 0.5)'
        : '0 1px 1px rgb(88 124 146 / 81%)',
      flexShrink: 0,
    },
    'aria-label': `Role: ${role}`,
    title: `Role: ${role}`,
  });
};
