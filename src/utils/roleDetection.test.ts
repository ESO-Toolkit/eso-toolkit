import { GearSlot, WeaponType, GearTrait, PlayerGear } from '../types/playerDetails';

import {
  detectRole,
  hasFrostStaffEquipped,
  hasRestoStaffEquipped,
  hasShieldEquipped,
} from './roleDetection';

const emptyGear = (): PlayerGear[] => {
  const gear: PlayerGear[] = [];
  for (let i = 0; i < 14; i++) {
    gear[i] = {
      id: 0,
      slot: i,
      quality: 1,
      icon: '',
      championPoints: 0,
      trait: GearTrait.SHARPENED,
      enchantType: 0,
      enchantQuality: 0,
      setID: 0,
      type: WeaponType.SWORD,
    };
  }
  return gear;
};

const withGearInSlot = (gear: PlayerGear[], slot: GearSlot, type: WeaponType): PlayerGear[] => {
  const copy = gear.map((g) => ({ ...g }));
  copy[slot] = { ...copy[slot], id: 12345, type };
  return copy;
};

describe('hasShieldEquipped', () => {
  it('returns false when no shield is equipped', () => {
    expect(hasShieldEquipped(emptyGear())).toBe(false);
  });

  it('detects shield in primary off-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.OFF_HAND, WeaponType.SHIELD);
    expect(hasShieldEquipped(gear)).toBe(true);
  });

  it('detects shield in backup off-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.BACKUP_OFF_HAND, WeaponType.SHIELD);
    expect(hasShieldEquipped(gear)).toBe(true);
  });

  it('ignores empty off-hand slots (id === 0)', () => {
    const gear = emptyGear();
    gear[GearSlot.OFF_HAND] = { ...gear[GearSlot.OFF_HAND], type: WeaponType.SHIELD };
    expect(hasShieldEquipped(gear)).toBe(false);
  });
});

describe('hasRestoStaffEquipped', () => {
  it('returns false when no resto staff is equipped', () => {
    expect(hasRestoStaffEquipped(emptyGear())).toBe(false);
  });

  it('detects resto staff in primary main-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.RESO_STAFF);
    expect(hasRestoStaffEquipped(gear)).toBe(true);
  });

  it('detects resto staff in backup main-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.BACKUP_MAIN_HAND, WeaponType.RESO_STAFF);
    expect(hasRestoStaffEquipped(gear)).toBe(true);
  });
});

describe('hasFrostStaffEquipped', () => {
  it('returns false when no frost staff is equipped', () => {
    expect(hasFrostStaffEquipped(emptyGear())).toBe(false);
  });

  it('detects frost staff in primary main-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.FROST_STAFF);
    expect(hasFrostStaffEquipped(gear)).toBe(true);
  });

  it('detects frost staff in backup main-hand', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.BACKUP_MAIN_HAND, WeaponType.FROST_STAFF);
    expect(hasFrostStaffEquipped(gear)).toBe(true);
  });
});

describe('detectRole', () => {
  it('falls back to API role when gear is undefined', () => {
    expect(detectRole('tank', undefined)).toBe('tank');
  });

  it('falls back to API role when gear is empty', () => {
    expect(detectRole('tank', [])).toBe('tank');
  });

  // Shield → always tank, regardless of API role
  it('overrides API dps to tank when shield equipped', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.OFF_HAND, WeaponType.SHIELD);
    expect(detectRole('dps', gear)).toBe('tank');
  });

  it('keeps API tank when shield equipped', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.OFF_HAND, WeaponType.SHIELD);
    expect(detectRole('tank', gear)).toBe('tank');
  });

  // Resto staff → always healer (when no shield)
  it('overrides API dps to healer when resto staff equipped', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.RESO_STAFF);
    expect(detectRole('dps', gear)).toBe('healer');
  });

  it('overrides API tank to healer when only resto staff equipped', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.BACKUP_MAIN_HAND, WeaponType.RESO_STAFF);
    expect(detectRole('tank', gear)).toBe('healer');
  });

  // Shield + resto staff → tank wins (tank with resto back bar)
  it('shield takes priority over resto staff', () => {
    let gear = withGearInSlot(emptyGear(), GearSlot.OFF_HAND, WeaponType.SHIELD);
    gear = withGearInSlot(gear, GearSlot.BACKUP_MAIN_HAND, WeaponType.RESO_STAFF);
    expect(detectRole('healer', gear)).toBe('tank');
  });

  // Frost staff → ambiguous, trust API
  it('trusts API tank role when frost staff equipped (ice tank)', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.FROST_STAFF);
    expect(detectRole('tank', gear)).toBe('tank');
  });

  it('trusts API dps role when frost staff equipped (frost DPS)', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.BACKUP_MAIN_HAND, WeaponType.FROST_STAFF);
    expect(detectRole('dps', gear)).toBe('dps');
  });

  it('trusts API tank role with double frost staves (ice tank)', () => {
    let gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.FROST_STAFF);
    gear = withGearInSlot(gear, GearSlot.BACKUP_MAIN_HAND, WeaponType.FROST_STAFF);
    expect(detectRole('tank', gear)).toBe('tank');
  });

  // No shield, no frost, no resto → DPS (override false tank)
  it('overrides API tank to dps when no tank weapons equipped', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.INFERNO_STAFF);
    expect(detectRole('tank', gear)).toBe('dps');
  });

  it('keeps dps for dual-wield setup', () => {
    let gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.DAGGER);
    gear = withGearInSlot(gear, GearSlot.OFF_HAND, WeaponType.DAGGER);
    expect(detectRole('dps', gear)).toBe('dps');
  });

  it('keeps dps for two-handed setup', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.TWO_HANDED_SWORD);
    expect(detectRole('dps', gear)).toBe('dps');
  });

  it('overrides API tank to dps for lightning staff user', () => {
    const gear = withGearInSlot(emptyGear(), GearSlot.MAIN_HAND, WeaponType.LIGHTNING_STAFF);
    expect(detectRole('tank', gear)).toBe('dps');
  });
});
