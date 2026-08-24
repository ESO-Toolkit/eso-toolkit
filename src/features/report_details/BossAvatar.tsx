import { Avatar, SxProps, Theme } from '@mui/material';
import React from 'react';

// Boss portraits are deliberately rendered as original, CSS-compatible SVG sigils. The former
// raster files were extracted game art without a redistribution grant. A deterministic sigil keeps
// the same name/alias coverage and image-based Avatar API while shipping no third-party artwork.
const bossAvatarGroups = [
  ['Lord Falgravn', 'Falgraven'],
  ['Captain Vrol', 'Vrol'],
  ['Yandir the Butcher'],
  ['Blood Drinker Thisa'],
  ['Hall of Fleshcraft', 'Shaper of Flesh', 'Shapers of Flesh'],
  ['Jynorah and Skorkhif'],
  ['Overfiend Kazpian'],
  ['Red Witch Gedna Relvel'],
  ['Tortured Ranyu', 'Tortured Kathutet', 'Tortured Amkaos', 'Tortured Trio'],
  ['Bow Breaker'],
  ['Lylanar and Turlassil'],
  ['Reef Guardian'],
  ['Sail Ripper'],
  ['Tideborn Taleria'],
  ['Ra Kotu'],
  ['The Warrior'],
  ['The Yokedas', "Yokeda Rok'dun", 'Yokedas'],
  ['Saint Felms the Bold', 'Lord Felms', 'Saint Felms'],
  ['Saint Llothis the Pious', 'Saint Llothis'],
  ['Saint Olms the Just', 'Saint Olms'],
  ['Ash Titan'],
  ['Basks-in-Snakes', 'Basks-In-Snakes'],
  ['Flame-Herald Bahsei'],
  ['Oaxiltso'],
  ['Xalvakka'],
  ['Foundation Stone Atronach', 'Storm Atronach'],
  ['Lightning Storm Atronach', 'Stone Atronach'],
  ['The Mage'],
  ['Varlariel'],
  ['Shade of Galenwe', 'Galenwe'],
  ['Shade of Relequen', 'Relequen'],
  ['Shade of Siroria', 'Siroria'],
  ["Z'maja"],
  ['Ozara'],
  ['Possessed Manticora', 'Possessed Mantikora'],
  ['Stonebreaker'],
  ['The Serpent', 'Serpent'],
  ['Archcustodian'],
  ['Assembly General'],
  ['Hunter-Killer Fabricant'],
  ['Pinnacle Factotum'],
  ['The Refabrication Committee'],
  ['Cavot Agnan', 'Xynizata'],
  ['Dariel Lemonds', 'Count Ryelaz'],
  ['Orphic Shattered Shard', 'Jresazzel'],
  ['Xoryn', 'Baron Rize'],
  ['Zilyseet', 'Zilyesset'],
  ["Zhaj'hassa the Forgotten"],
  ['Rakkhat'],
  ['The Twins', 'Vashai'],
] as const;

const bossAvatarCanonicalNames = new Map<string, string>();
bossAvatarGroups.forEach(([canonicalName, ...aliases]) => {
  [canonicalName, ...aliases].forEach((name) => bossAvatarCanonicalNames.set(name, canonicalName));
});

function createBossSigilDataUri(canonicalName: string): string {
  let hash = 0;
  for (const character of canonicalName) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  const initials = canonicalName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 72% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 52) % 360} 72% 32%)"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#g)"/><path d="M32 8 53 20v19L32 56 11 39V20z" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="2"/><path d="m32 18 9 14-9 14-9-14z" fill="rgba(8,15,30,.42)"/><text x="32" y="36" fill="white" font-family="system-ui,sans-serif" font-size="12" font-weight="700" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getBossAvatarSrc(bossName: string): string | null {
  // Remove instance numbers and extra text to match avatar keys
  const cleanName = bossName.replace(/#\d+$/, '').trim();
  const canonicalName = bossAvatarCanonicalNames.get(cleanName);
  return canonicalName ? createBossSigilDataUri(canonicalName) : null;
}

export interface BossAvatarProps {
  bossName: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export const BossAvatar: React.FC<BossAvatarProps> = ({ bossName, size = 32, sx = {} }) => {
  const avatarSrc = getBossAvatarSrc(bossName);

  if (!avatarSrc) {
    return null;
  }

  return (
    <Avatar
      src={avatarSrc}
      alt={bossName}
      sx={{
        width: size,
        height: size,
        border: '1.5px solid #b3b3b3f2',
        boxShadow:
          'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)',
        ...sx,
      }}
    />
  );
};

// Export the function for backwards compatibility if needed
export { getBossAvatarSrc };
