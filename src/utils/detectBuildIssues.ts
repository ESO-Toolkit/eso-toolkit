<<<<<<< HEAD
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

    // Enchantment quality check: only flag if below the allowed maximum (min(gear quality, 5)).
    // Example: if gear quality is 4, do NOT flag enchant quality 4; if gear is 5, flag when enchant < 5.
    const gearQ = typeof g.quality === 'number' ? g.quality : 0;
    const enchantQ = typeof g.enchantQuality === 'number' ? g.enchantQuality : 0;
    const allowedMax = gearQ > 0 ? Math.min(5, gearQ) : 5; // default to 5 if gear quality unknown
    if (enchantQ < allowedMax) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        enchantQuality: enchantQ,
        message: `${g.name || 'Unnamed Gear'}: Enchantment quality is ${enchantQ} (should be ${allowedMax})`,
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

=======
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

    // Enchantment quality check: only flag if below the allowed maximum (min(gear quality, 5)).
    // Example: if gear quality is 4, do NOT flag enchant quality 4; if gear is 5, flag when enchant < 5.
    const gearQ = typeof g.quality === 'number' ? g.quality : 0;
    const enchantQ = typeof g.enchantQuality === 'number' ? g.enchantQuality : 0;
    const allowedMax = gearQ > 0 ? Math.min(5, gearQ) : 5; // default to 5 if gear quality unknown
    if (enchantQ < allowedMax) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        enchantQuality: enchantQ,
        message: `${g.name || 'Unnamed Gear'}: Enchantment quality is ${enchantQ} (should be ${allowedMax})`,
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
>>>>>>> pr-21
