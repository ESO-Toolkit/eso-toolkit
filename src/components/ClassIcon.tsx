import React from 'react';

// Import legacy dk icon - this appears to be using a different path
import dkIcon from '../assets/dk-white.png';
import necromancerIcon from '../assets/necromancer-white.png';
import ninjaNightbladeIcon from '../assets/nightblade-white.png';
import sorcererIcon from '../assets/sorcerer.png';
import templarIcon from '../assets/templar-white.png';
import wardenIcon from '../assets/warden-white.png';
import arcanistIcon from '../assets/white-arcanist.png';

// Class icon mapping using imported ES modules
const CLASS_ICON_MAP: Record<string, string | undefined> = {
  dragonknight: dkIcon,
  templar: templarIcon,
  warden: wardenIcon,
  nightblade: ninjaNightbladeIcon,
  sorcerer: sorcererIcon,
  necromancer: necromancerIcon,
  arcanist: arcanistIcon,
};

function getClassIconSrc(className: string): string | null {
  const normalizedClass = className.trim().toLowerCase();
  return CLASS_ICON_MAP[normalizedClass] || null;
}

export interface ClassIconProps {
  className: string;
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
}

export const ClassIcon: React.FC<ClassIconProps> = ({ className, size = 12, alt, style = {} }) => {
  const iconSrc = getClassIconSrc(className);

  if (!iconSrc) {
    return null;
  }

  return (
    <img
      src={iconSrc}
      alt={alt || className}
      width={size}
      height={size}
      style={{
        opacity: 0.8,
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

// Export the function for backwards compatibility if needed
export { getClassIconSrc };
