/**
 * Tests for role classification logic
 */

import { classifyPlayers } from '../classifyPlayers';
import { DetectedRole, PlayerRoleSignals } from '../types';

const FIGHT_DURATION_MS = 60000; // 60 seconds

function createSignals(
  overrides: Partial<PlayerRoleSignals> & { playerId: number },
): PlayerRoleSignals {
  return {
    playerName: `Player ${overrides.playerId}`,
    tauntCastCount: 0,
    tauntUptimeOnBossMs: 0,
    tauntedUniqueEnemies: 0,
    hasShieldWeapon: false,
    hasFrostStaff: false,
    heavyArmorCount: 0,
    tankSetIds: [],
    healerSetIds: [],
    dpsSetIds: [],
    supportDpsSetIds: [],
    totalDamage: 0,
    dps: 0,
    totalHealing: 0,
    hps: 0,
    overhealRatio: 0,
    damageShareOfGroup: 0,
    healingShareOfGroup: 0,
    damageTaken: 0,
    damageTakenShareOfGroup: 0,
    blockedHitCount: 0,
    totalHitsTaken: 0,
    hornCasts: 0,
    barrierCasts: 0,
    majorCourageTargets: 0,
    shieldAppliedToOthers: 0,
    uniqueBuffTypesApplied: 0,
    uniqueTargetsBuffed: 0,
    offensiveBuffCategoryCount: 0,
    ...overrides,
  };
}

describe('classifyPlayers', () => {
  describe('tank detection', () => {
    it('should detect Main Tank with strong taunt uptime', () => {
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 45000, // 75% uptime
          tauntCastCount: 4,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446], // Yolnahkriin
          damageTakenShareOfGroup: 0.4,
          damageShareOfGroup: 0.02,
        }),
        createSignals({ playerId: 2, damageShareOfGroup: 0.5, dpsSetIds: [389] }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.48, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const tank = results.find((r) => r.playerId === 1)!;
      expect(tank.role).toBe(DetectedRole.MainTank);
      expect(tank.confidence).toBeGreaterThanOrEqual(50);
    });

    it('should detect Off Tank as second-highest tank scorer', () => {
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 45000,
          tauntCastCount: 4,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446],
          damageTakenShareOfGroup: 0.35,
          damageShareOfGroup: 0.02,
        }),
        createSignals({
          playerId: 2,
          tauntCastCount: 2,
          tauntedUniqueEnemies: 3, // taunts adds
          hasShieldWeapon: true,
          heavyArmorCount: 5,
          tankSetIds: [232], // Alkosh
          damageTakenShareOfGroup: 0.2,
          damageShareOfGroup: 0.03,
        }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.45, dpsSetIds: [389] }),
        createSignals({ playerId: 4, damageShareOfGroup: 0.45, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const mt = results.find((r) => r.playerId === 1)!;
      const ot = results.find((r) => r.playerId === 2)!;
      expect(mt.role).toBe(DetectedRole.MainTank);
      expect(ot.role).toBe(DetectedRole.OffTank);
    });

    it('should not classify DPS as tank without taunt signals', () => {
      const signals = [
        createSignals({
          playerId: 1,
          damageShareOfGroup: 0.5,
          dpsSetIds: [389],
          totalDamage: 500000,
        }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);
      expect(results[0].role).not.toBe(DetectedRole.MainTank);
      expect(results[0].role).not.toBe(DetectedRole.OffTank);
    });

    it('should not classify healer in heavy armor + shield as tank without taunts', () => {
      // Aylaynu case: healer wearing heavy armor and shield, 0 taunts
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 45000,
          tauntCastCount: 50,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [633, 771],
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.3,
        }),
        createSignals({
          playerId: 2,
          playerName: 'TankyHealer',
          // 0 taunts — should NOT be classified as tank
          hasShieldWeapon: true,
          heavyArmorCount: 6,
          healerSetIds: [687],
          healingShareOfGroup: 0.36,
          majorCourageTargets: 10,
          barrierCasts: 3,
          damageShareOfGroup: 0.001,
        }),
        createSignals({
          playerId: 3,
          healingShareOfGroup: 0.3,
          healerSetIds: [436, 185],
          majorCourageTargets: 11,
          damageShareOfGroup: 0.004,
        }),
        ...Array.from({ length: 8 }, (_, i) =>
          createSignals({
            playerId: 4 + i,
            damageShareOfGroup: 0.12,
            dpsSetIds: [389],
            totalDamage: 500000,
          }),
        ),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const player2 = results.find((r) => r.playerId === 2)!;
      expect(player2.role).not.toBe(DetectedRole.MainTank);
      expect(player2.role).not.toBe(DetectedRole.OffTank);
      // Should be classified as a healer
      expect([
        DetectedRole.GroupHealer,
        DetectedRole.ShieldHealer,
        DetectedRole.BuffHealer,
      ]).toContain(player2.role);
    });

    it('should classify healer who occasionally taunts as healer, not tank', () => {
      // A healer throws Inner Fire a couple of times to grab adds,
      // but their healing signals dominate their tank signals.
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 45000,
          tauntCastCount: 50,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446, 771],
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.35,
        }),
        createSignals({
          playerId: 2,
          playerName: 'HealerWhoTaunts',
          tauntCastCount: 2,
          tauntedUniqueEnemies: 1,
          // Strong healer signals that dominate tank signals
          healingShareOfGroup: 0.35,
          healerSetIds: [391, 497],
          majorCourageTargets: 8,
          barrierCasts: 1,
          damageShareOfGroup: 0.005,
        }),
        ...Array.from({ length: 10 }, (_, i) =>
          createSignals({
            playerId: 3 + i,
            damageShareOfGroup: 0.1,
            dpsSetIds: [389],
            totalDamage: 600000,
          }),
        ),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const player2 = results.find((r) => r.playerId === 2)!;
      expect(player2.role).not.toBe(DetectedRole.MainTank);
      expect(player2.role).not.toBe(DetectedRole.OffTank);
      expect([
        DetectedRole.GroupHealer,
        DetectedRole.ShieldHealer,
        DetectedRole.BuffHealer,
      ]).toContain(player2.role);
    });

    it('should support 1-tank composition', () => {
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 50000,
          tauntCastCount: 10,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446],
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.5,
        }),
        // All others are DPS — no second tank
        ...Array.from({ length: 3 }, (_, i) =>
          createSignals({
            playerId: 2 + i,
            damageShareOfGroup: 0.33,
            dpsSetIds: [389, 526],
            totalDamage: 1000000,
          }),
        ),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const tanks = results.filter(
        (r) => r.role === DetectedRole.MainTank || r.role === DetectedRole.OffTank,
      );
      expect(tanks).toHaveLength(1);
      expect(tanks[0].role).toBe(DetectedRole.MainTank);
    });

    it('should support 3-tank composition', () => {
      const signals = [
        createSignals({
          playerId: 1,
          playerName: 'Tank1',
          tauntUptimeOnBossMs: 40000,
          tauntCastCount: 8,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446],
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.25,
        }),
        createSignals({
          playerId: 2,
          playerName: 'Tank2',
          tauntCastCount: 5,
          tauntedUniqueEnemies: 3,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [232],
          damageShareOfGroup: 0.02,
          damageTakenShareOfGroup: 0.2,
        }),
        createSignals({
          playerId: 3,
          playerName: 'Tank3',
          tauntCastCount: 3,
          tauntedUniqueEnemies: 2,
          hasShieldWeapon: true,
          heavyArmorCount: 5,
          damageShareOfGroup: 0.03,
          damageTakenShareOfGroup: 0.15,
        }),
        ...Array.from({ length: 9 }, (_, i) =>
          createSignals({
            playerId: 4 + i,
            damageShareOfGroup: 0.1,
            dpsSetIds: [389],
            totalDamage: 600000,
          }),
        ),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const tanks = results.filter(
        (r) => r.role === DetectedRole.MainTank || r.role === DetectedRole.OffTank,
      );
      expect(tanks).toHaveLength(3);
      expect(tanks.filter((t) => t.role === DetectedRole.MainTank)).toHaveLength(1);
      expect(tanks.filter((t) => t.role === DetectedRole.OffTank)).toHaveLength(2);
    });
  });

  describe('healer detection', () => {
    it('should detect Group Healer with high healing and healer sets', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.4,
          healerSetIds: [391], // Olorime
          majorCourageTargets: 6,
          damageShareOfGroup: 0.02,
        }),
        createSignals({ playerId: 2, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healer = results.find((r) => r.playerId === 1)!;
      expect(healer.role).toBe(DetectedRole.GroupHealer);
      expect(healer.confidence).toBeGreaterThanOrEqual(40);
    });

    it('should detect Shield Healer when barrier + shield healer sets present', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.3,
          healerSetIds: [194], // Combat Physician (shield healer set)
          barrierCasts: 2,
          shieldAppliedToOthers: 100000,
          damageShareOfGroup: 0.02,
        }),
        createSignals({ playerId: 2, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healer = results.find((r) => r.playerId === 1)!;
      expect(healer.role).toBe(DetectedRole.ShieldHealer);
    });

    it('should detect Buff Healer with >= 2 offensive buff categories', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.3,
          healerSetIds: [346], // Jorvuld's Guidance
          offensiveBuffCategoryCount: 3, // Major Slayer + Powerful Assault + Horn
          hornCasts: 3,
          damageShareOfGroup: 0.02,
        }),
        createSignals({ playerId: 2, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healer = results.find((r) => r.playerId === 1)!;
      expect(healer.role).toBe(DetectedRole.BuffHealer);
    });

    it('should not classify healer as Buff Healer with < 2 offensive categories', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.3,
          healerSetIds: [346], // Jorvuld's Guidance (buff healer set)
          offensiveBuffCategoryCount: 1, // Only 1 category — below threshold
          hornCasts: 3,
          damageShareOfGroup: 0.02,
        }),
        createSignals({ playerId: 2, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.49, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healer = results.find((r) => r.playerId === 1)!;
      expect(healer.role).toBe(DetectedRole.GroupHealer);
    });

    it('should pick healer with most offensive categories when both qualify', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.35,
          healerSetIds: [391], // Olorime
          offensiveBuffCategoryCount: 2, // Passes gate but fewer categories
          damageShareOfGroup: 0.01,
        }),
        createSignals({
          playerId: 2,
          healingShareOfGroup: 0.25,
          healerSetIds: [346], // Jorvuld's
          offensiveBuffCategoryCount: 4, // More categories → wins tiebreak
          hornCasts: 2,
          damageShareOfGroup: 0.01,
        }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.98, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      expect(results.find((r) => r.playerId === 2)?.role).toBe(DetectedRole.BuffHealer);
      expect(results.find((r) => r.playerId === 1)?.role).toBe(DetectedRole.GroupHealer);
    });

    it('should assign neither healer as Buff Healer when tied on offensive categories', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.35,
          healerSetIds: [391],
          offensiveBuffCategoryCount: 3,
          damageShareOfGroup: 0.01,
        }),
        createSignals({
          playerId: 2,
          healingShareOfGroup: 0.25,
          healerSetIds: [346],
          offensiveBuffCategoryCount: 3, // Tied → neither gets Buff Healer
          damageShareOfGroup: 0.01,
        }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.98, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const buffHealers = results.filter((r) => r.role === DetectedRole.BuffHealer);
      expect(buffHealers).toHaveLength(0);
    });

    it('should classify both as Group Healer when neither passes buff gate', () => {
      const signals = [
        createSignals({
          playerId: 1,
          healingShareOfGroup: 0.35,
          healerSetIds: [391],
          offensiveBuffCategoryCount: 1,
          damageShareOfGroup: 0.01,
        }),
        createSignals({
          playerId: 2,
          healingShareOfGroup: 0.25,
          healerSetIds: [497],
          offensiveBuffCategoryCount: 0,
          damageShareOfGroup: 0.01,
        }),
        createSignals({ playerId: 3, damageShareOfGroup: 0.98, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healers = results.filter(
        (r) =>
          r.role === DetectedRole.GroupHealer ||
          r.role === DetectedRole.ShieldHealer ||
          r.role === DetectedRole.BuffHealer,
      );
      expect(healers).toHaveLength(2);
      expect(healers.every((h) => h.role === DetectedRole.GroupHealer)).toBe(true);
    });

    it('should identify two healers in a trial setup', () => {
      const signals = [
        createSignals({
          playerId: 1,
          tauntUptimeOnBossMs: 45000,
          tauntCastCount: 4,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446],
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.4,
        }),
        createSignals({
          playerId: 2,
          healingShareOfGroup: 0.35,
          healerSetIds: [391], // Olorime
          majorCourageTargets: 8,
          damageShareOfGroup: 0.01,
        }),
        createSignals({
          playerId: 3,
          healingShareOfGroup: 0.25,
          healerSetIds: [194], // Combat Physician
          barrierCasts: 1,
          shieldAppliedToOthers: 50000,
          damageShareOfGroup: 0.01,
        }),
        createSignals({ playerId: 4, damageShareOfGroup: 0.97, dpsSetIds: [389] }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      const healers = results.filter(
        (r) =>
          r.role === DetectedRole.GroupHealer ||
          r.role === DetectedRole.ShieldHealer ||
          r.role === DetectedRole.BuffHealer,
      );
      expect(healers).toHaveLength(2);
    });
  });

  describe('DPS classification', () => {
    it('should classify Parse DPS with DPS sets and high damage', () => {
      const signals = [
        createSignals({
          playerId: 1,
          damageShareOfGroup: 0.5,
          dpsSetIds: [389, 526], // Relequen + Perfected Crushing Wall
          totalDamage: 1000000,
        }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      expect(results[0].role).toBe(DetectedRole.ParseDPS);
    });

    it('should classify Support DPS when wearing support DPS sets', () => {
      const signals = [
        createSignals({
          playerId: 1,
          damageShareOfGroup: 0.1,
          supportDpsSetIds: [455], // Z'en's Redress
          totalDamage: 300000,
        }),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      expect(results[0].role).toBe(DetectedRole.SupportDPS);
    });
  });

  describe('full trial composition', () => {
    it('should classify a standard 12-player trial comp', () => {
      const signals = [
        // Main Tank
        createSignals({
          playerId: 1,
          playerName: 'MainTank',
          tauntUptimeOnBossMs: 50000,
          tauntCastCount: 4,
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [446, 276], // Yolnahkriin + Tremorscale
          damageShareOfGroup: 0.01,
          damageTakenShareOfGroup: 0.35,
          hornCasts: 2,
        }),
        // Off Tank
        createSignals({
          playerId: 2,
          playerName: 'OffTank',
          tauntCastCount: 3,
          tauntedUniqueEnemies: 4,
          tauntUptimeOnBossMs: 5000, // low boss uptime, taunts adds
          hasShieldWeapon: true,
          heavyArmorCount: 7,
          tankSetIds: [232], // Alkosh
          damageShareOfGroup: 0.02,
          damageTakenShareOfGroup: 0.2,
          hornCasts: 1,
        }),
        // Group Healer
        createSignals({
          playerId: 3,
          playerName: 'GroupHealer',
          healingShareOfGroup: 0.4,
          healerSetIds: [391, 497], // Olorime + Perfected RO
          majorCourageTargets: 10,
          damageShareOfGroup: 0.005,
          hornCasts: 1,
        }),
        // Buff Healer
        createSignals({
          playerId: 4,
          playerName: 'BuffHealer',
          healingShareOfGroup: 0.25,
          healerSetIds: [346], // Jorvuld's Guidance
          offensiveBuffCategoryCount: 3, // Major Slayer + Powerful Assault + Horn
          hornCasts: 2,
          damageShareOfGroup: 0.005,
        }),
        // Support DPS
        createSignals({
          playerId: 5,
          playerName: 'SupportDPS',
          damageShareOfGroup: 0.1,
          supportDpsSetIds: [455], // Z'en's
          totalDamage: 600000,
        }),
        // Parse DPS x7
        ...Array.from({ length: 7 }, (_, i) =>
          createSignals({
            playerId: 6 + i,
            playerName: `ParseDPS${i + 1}`,
            damageShareOfGroup: 0.12,
            dpsSetIds: [389, 526],
            totalDamage: 800000,
          }),
        ),
      ];

      const results = classifyPlayers(signals, FIGHT_DURATION_MS);

      expect(results.find((r) => r.playerId === 1)?.role).toBe(DetectedRole.MainTank);
      expect(results.find((r) => r.playerId === 2)?.role).toBe(DetectedRole.OffTank);

      const healers = results.filter(
        (r) =>
          r.role === DetectedRole.GroupHealer ||
          r.role === DetectedRole.ShieldHealer ||
          r.role === DetectedRole.BuffHealer,
      );
      expect(healers).toHaveLength(2);

      expect(results.find((r) => r.playerId === 5)?.role).toBe(DetectedRole.SupportDPS);

      const parseDps = results.filter((r) => r.role === DetectedRole.ParseDPS);
      expect(parseDps).toHaveLength(7);
    });
  });
});
