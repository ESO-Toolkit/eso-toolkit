import React from 'react';

export const ROLE_COLORS = {
  dps: '#ff8b61', // Orange for DPS (matches damage table)
  healer: '#b970ff', // Purple for Healer (matches damage table)
  tank: '#62baff', // Blue for Tank (matches damage table)
} as const;

type Role = 'dps' | 'healer' | 'tank';

export const getRoleColor = (role: Role): string => {
  return ROLE_COLORS[role] || '#9e9e9e'; // Default to gray if role not found
};

interface RoleIndicatorProps {
  role: Role;
}

export const RoleIndicator: React.FC<RoleIndicatorProps> = ({ role }) => {
  return React.createElement('span', {
    style: {
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: getRoleColor(role),
      border: '2px solid white',
      boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
      flexShrink: 0,
    },
    'aria-label': `Role: ${role}`,
    title: `Role: ${role}`,
  });
};
