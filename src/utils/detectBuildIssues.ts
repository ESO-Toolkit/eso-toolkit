import { PlayerGear } from '../types/playerDetails';

export interface BuildIssue {
  gearName: string;
  enchantQuality: number;
  message: string;
}

export function detectBuildIssues(gear: PlayerGear[]): BuildIssue[] {
  if (!gear) return [];
  const issues: BuildIssue[] = [];
  gear.forEach((g) => {
    if (g.id === 0) {
      return;
    }

    // Enchantment quality is not legendary
    if (g.enchantQuality !== 5) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        enchantQuality: g.enchantQuality,
        message: `${g.name || 'Unnamed Gear'}: Enchantment quality is ${g.enchantQuality} (should be 5)`,
      });
    }

    // Gear quality is not legendary
    if (g.quality !== 5) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        enchantQuality: g.quality,
        message: `${g.name || 'Unnamed Gear'}: Gear quality is ${g.quality} (should be 5)`,
      });
    }
  });
  return issues;
}
