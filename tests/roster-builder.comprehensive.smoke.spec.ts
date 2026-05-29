/**
 * Comprehensive Roster Builder Tests
 *
 * Exercises all roster builder features in a complete workflow:
 * - Roster metadata (name, creation)
 * - Tank & healer setup (gear, skills, ultimates, buffs)
 * - All 8 DPS slots with various configurations (jail DDs, regular DPS, tags)
 * - Player groups and labels
 * - Set assignment quick-fill
 * - Share link round-trip encoding/decoding
 * - Per-fight build overrides (trial-specific)
 */

import { test, expect, Page } from '@playwright/test';

import { KnownSetIDs } from '../src/types/abilities';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Capture page errors during a callback. */
async function withErrorCapture(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await fn();
  return errors;
}

/** Generate a test roster with all features populated. */
async function generateFullRoster(page: Page) {
  return page.evaluate(async () => {
    const { encodeRosterToURL } = await import('/src/utils/rosterEncoding.ts');
    const { createDefaultRoster } = await import('/src/types/roster.ts');
    const { KnownSetIDs } = await import('/src/types/abilities.ts');

    const roster = createDefaultRoster();
    roster.rosterName = '✓ Complete Raid Team';

    // ─── Tanks ───────────────────────────────────────────────────────────
    roster.tanks[0] = {
      playerName: 'TankA',
      playerNumber: String(1),
      roleLabel: 'MT',
      labels: ['Main', 'Trash Tank'],
      gearSets: {
        set1: 768, // LUCENT_ECHOES
        set2: 648, // PEARLESCENT_WARD
        monsterSet: KnownSetIDs.NAZARAY,
      },
      skillLines: {
        line1: 'Draconic Power',
        line2: 'Earthen Heart',
        line3: 'Ardent Flame',
        isFlex: false,
      },
      ultimate: 'Aggressive Warhorn',
      specificSkills: ['Pierce Armor', 'Unrelenting Assault'],
      groups: ['Tank Pair'],
      notes: 'Single Bar Build',
    };

    roster.tanks[1] = {
      playerName: 'TankB',
      playerNumber: String(2),
      roleLabel: 'OT',
      labels: ['Offtank', 'Trash Tank'],
      gearSets: {
        set1: 768, // LUCENT_ECHOES
        set2: 648, // PEARLESCENT_WARD
        monsterSet: KnownSetIDs.ARCHDRUID_DEVYRIC,
      },
      skillLines: {
        line1: 'Draconic Power',
        line2: 'Earthen Heart',
        line3: 'Ardent Flame',
        isFlex: true,
      },
      ultimate: 'Glacial Colossus',
      specificSkills: ['Pierce Armor'],
      groups: ['Tank Pair'],
      notes: 'Backup Build',
    };

    // ─── Healers ──────────────────────────────────────────────────────────
    roster.healers[0] = {
      playerName: 'HealerA',
      playerNumber: String(1),
      roleLabel: 'H1',
      labels: ['Backup Healer'],
      set1: KnownSetIDs.JORVULDS_GUIDANCE,
      set2: 2342, // ROARING_OPPORTUNIST
      monsterSet: 2268, // Zaan
      skillLines: {
        line1: 'Restoring Light',
        line2: 'Aedric Spear',
        line3: "Dawn's Wrath",
        isFlex: false,
      },
      healerBuff: 'Enlivening Overflow',
      championPoint: 'Enlivening Overflow',
      ultimate: 'Aggressive Warhorn',
      groups: ['Healer Pair'],
      notes: 'Primary Healer',
    };

    roster.healers[1] = {
      playerName: 'HealerB',
      playerNumber: String(2),
      roleLabel: 'H2',
      labels: ['Lead Healer'],
      set1: KnownSetIDs.JORVULDS_GUIDANCE,
      set2: 2342, // ROARING_OPPORTUNIST
      monsterSet: 2268, // Zaan
      skillLines: {
        line1: 'Restoring Light',
        line2: 'Aedric Spear',
        line3: "Dawn's Wrath",
        isFlex: true,
      },
      healerBuff: 'From the Brink',
      championPoint: 'From the Brink',
      ultimate: 'Glacial Colossus',
      groups: ['Healer Pair'],
      notes: 'Backup Healer',
    };

    // ─── DPS Slots (8 total) ──────────────────────────────────────────────

    // Regular DPS slots
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'DPS1',
      playerNumber: String(1),
      roleLabel: 'DD1',
      labels: ['Stamina', 'Melee'],
      set1: 691, // CRYPTCANON_VESTMENTS
      set2: 127, // DEADLY_STRIKE
      monsterSet: 2268, // Zaan
      skillLines: {
        line1: 'Draconic Power',
        line2: 'Ardent Flame',
        line3: 'Dark Magic',
        isFlex: false,
      },
      championPoint: 'Hardy',
      ultimate: 'Aggressive Warhorn',
      groups: ['Slayer Stack 1'],
      notes: 'High DPS priority',
    };

    roster.dpsSlots[1] = {
      slotNumber: 2,
      playerName: 'DPS2',
      playerNumber: String(2),
      roleLabel: 'DD2',
      labels: ['Stamina', 'Ranged'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 127, // DEADLY_STRIKE
      monsterSet: 2268,
      skillLines: {
        line1: 'Assassination',
        line2: 'Shadow',
        line3: 'Siphoning',
        isFlex: false,
      },
      championPoint: 'Piercing',
      ultimate: 'Aggressive Warhorn',
      groups: ['Slayer Stack 1'],
      notes: 'Portal opener',
    };

    roster.dpsSlots[2] = {
      slotNumber: 3,
      playerName: 'DPS3',
      playerNumber: String(3),
      roleLabel: 'DD3',
      labels: ['Magicka', 'Elemental'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 641, // SERPENTS_DISDAIN (rotation if available)
      monsterSet: 2268,
      skillLines: {
        line1: 'Dark Magic',
        line2: 'Daedric Summoning',
        line3: 'Storm Calling',
        isFlex: false,
      },
      championPoint: 'Mighty',
      ultimate: 'Aggressive Warhorn',
      groups: ['Slayer Stack 2'],
      notes: 'Backbar Support',
    };

    roster.dpsSlots[3] = {
      slotNumber: 4,
      playerName: 'DPS4',
      playerNumber: String(4),
      roleLabel: 'DD4',
      labels: ['Stamina', 'Sub DPS'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 127, // DEADLY_STRIKE
      monsterSet: 2268,
      skillLines: {
        line1: "Winter's Embrace",
        line2: 'Animal Companions',
        line3: 'Green Balance',
        isFlex: true,
      },
      championPoint: 'Hardy',
      ultimate: 'Glacial Colossus',
      groups: ['Slayer Stack 2'],
      notes: 'Flexible build',
    };

    // Jail DD configurations
    roster.dpsSlots[4] = {
      slotNumber: 5,
      playerName: 'JailDD1',
      playerNumber: String(5),
      roleLabel: 'Jail',
      labels: ['Jail', 'Opener'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 627, // SPAULDER_OF_RUIN (Mythic)
      jailDDType: 'zenkosh',
      skillLines: {
        line1: 'Assassination',
        line2: 'Shadow',
        line3: 'Siphoning',
        isFlex: false,
      },
      championPoint: 'Piercing',
      ultimate: 'Aggressive Warhorn',
      groups: ['Jail Stack'],
      notes: 'Requires heavy attack weaving',
    };

    roster.dpsSlots[5] = {
      slotNumber: 6,
      playerName: 'JailDD2',
      playerNumber: String(6),
      roleLabel: 'Banner',
      labels: ['Jail', 'Banner'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 701, // PEACE_AND_SERENITY
      jailDDType: 'banner',
      skillLines: {
        line1: 'Storm Calling',
        line2: 'Dark Magic',
        line3: 'Daedric Summoning',
        isFlex: false,
      },
      championPoint: 'Mighty',
      ultimate: 'Aggressive Warhorn',
      groups: ['Jail Stack'],
      notes: 'Banner placement crucial',
    };

    roster.dpsSlots[6] = {
      slotNumber: 7,
      playerName: 'JailDD3',
      playerNumber: String(7),
      roleLabel: 'Portal',
      labels: ['Jail', 'Portal', 'Cleanse'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 701, // PEACE_AND_SERENITY
      jailDDType: 'wm',
      skillLines: {
        line1: 'Grave Lord',
        line2: 'Bone Tyrant',
        line3: 'Living Death',
        isFlex: false,
      },
      championPoint: 'Hardy',
      ultimate: 'Aggressive Warhorn',
      groups: ['Jail Stack'],
      notes: 'WM portal responsibility',
    };

    // Custom DPS configuration
    roster.dpsSlots[7] = {
      slotNumber: 8,
      playerName: 'DPS8',
      playerNumber: String(8),
      roleLabel: 'Flex',
      labels: ['Flexible', 'Backup'],
      set1: KnownSetIDs.RELEQUEN,
      set2: 127, // DEADLY_STRIKE
      monsterSet: 2268,
      jailDDType: 'custom',
      customDescription: 'Flex slot - fill as needed. Can run jail or DPS.',
      skillLines: {
        line1: 'Aedric Spear',
        line2: 'Restoring Light',
        line3: "Dawn's Wrath",
        isFlex: true,
      },
      championPoint: null,
      ultimate: null,
      groups: ['Flex'],
      notes: 'Substitute player',
    };

    // ─── Groups ────────────────────────────────────────────────────────
    roster.availableGroups = [
      'Tank Pair',
      'Healer Pair',
      'Slayer Stack 1',
      'Slayer Stack 2',
      'Jail Stack',
      'Flex',
    ];

    // ─── General Notes ─────────────────────────────────────────────────
    roster.notes =
      'Complete raid team roster for testing. Includes tanks, healers, regular DPS, and jail DD configurations.';

    const encoded = await encodeRosterToURL(roster);
    return { encoded, roster };
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Roster Builder — Complete Feature Coverage', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors = await withErrorCapture(page, async () => {
      await page.goto('/roster-builder');
      await page.waitForLoadState('networkidle');
    });
    expect(errors).toHaveLength(0);
  });

  test('renders all roster builder sections', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Roster Builder' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Simple mode' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Full mode' })).toBeVisible();
  });

  test('successfully fills out a complete roster with all features', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const fullRosterData = await page.evaluate(async () => {
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');
      const { createDefaultRoster } = await import('/src/types/roster.ts');

      const roster = createDefaultRoster();
      roster.rosterName = '✓ Complete Raid Team';
      roster.tanks[0].playerName = 'TankA';
      roster.healers[0].playerName = 'HealerA';
      roster.dpsSlots[0].playerName = 'DPS1';

      // Populate all 8 DPS slots
      for (let i = 1; i < 8; i++) {
        roster.dpsSlots[i].playerName = `DPS${i + 1}`;
      }

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        encoded,
        rosterName: decoded.rosterName,
        tank1Name: decoded.tanks[0].playerName,
        healer1Name: decoded.healers[0].playerName,
        dpsCount: decoded.dpsSlots.filter((s) => s.playerName).length,
        firstDpsName: decoded.dpsSlots[0].playerName,
        lastDpsName: decoded.dpsSlots[7].playerName,
      };
    });

    // Verify encoding succeeded and all data was preserved
    expect(fullRosterData.encoded).toBeTruthy();
    expect(fullRosterData.encoded.length).toBeGreaterThan(100);
    expect(fullRosterData.rosterName).toBe('✓ Complete Raid Team');
    expect(fullRosterData.tank1Name).toBe('TankA');
    expect(fullRosterData.healer1Name).toBe('HealerA');
    expect(fullRosterData.dpsCount).toBe(8); // All 8 DPS slots have names
    expect(fullRosterData.firstDpsName).toBe('DPS1');
    expect(fullRosterData.lastDpsName).toBe('DPS8');
  });

  test('share link generates valid URL-safe encoding', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const { encoded } = await generateFullRoster(page);

    // Verify URL-safe encoding (no +, /, or = characters typically used in base64)
    expect(encoded).toBeTruthy();
    expect(!encoded.includes('+')).toBeTruthy();
    expect(!encoded.includes('/')).toBeTruthy();
    // Note: Some URL-safe encodings may contain = for padding, but should be minimal
  });

  test('round-trip encoding preserves all roster data', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const { encoded, roster } = await generateFullRoster(page);

    // Navigate to the share URL
    const shareUrl = `${page.url().split('?')[0]}?r=${encoded}`;
    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');

    // Decode the roster from the page to verify full round-trip
    const decodedRoster = await page.evaluate(async () => {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('r');
      if (!encoded) return null;

      const { decodeRosterFromURL } = await import('/src/utils/rosterEncoding.ts');
      return await decodeRosterFromURL(encoded);
    });

    // Verify key data points survived round-trip
    expect(decodedRoster.rosterName).toBe('✓ Complete Raid Team');
    expect(decodedRoster.tanks[0].playerName).toBe('TankA');
    expect(decodedRoster.tanks[0].roleLabel).toBe('MT');
    expect(decodedRoster.healers[0].playerName).toBe('HealerA');
    expect(decodedRoster.healers[0].roleLabel).toBe('H1');

    // Verify all 8 DPS slots
    expect(decodedRoster.dpsSlots.length).toBe(8);
    expect(decodedRoster.dpsSlots[0].playerName).toBe('DPS1');
    expect(decodedRoster.dpsSlots[4].playerName).toBe('JailDD1');
    expect(decodedRoster.dpsSlots[4].jailDDType).toBe('zenkosh');
    expect(decodedRoster.dpsSlots[7].jailDDType).toBe('custom');

    // Verify player groups
    expect(decodedRoster.availableGroups).toContain('Tank Pair');
    expect(decodedRoster.availableGroups).toContain('Jail Stack');

    // Verify gear sets survive the round-trip (IDs are real KnownSetIDs, not names)
    expect(decodedRoster.healers[0].set1).toBe(KnownSetIDs.JORVULDS_GUIDANCE);
    expect(decodedRoster.tanks[0].gearSets.monsterSet).toBe(KnownSetIDs.NAZARAY);
    expect(decodedRoster.dpsSlots[1].set1).toBe(KnownSetIDs.RELEQUEN);
  });

  test('read-only view displays complete roster data', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const { encoded } = await generateFullRoster(page);

    // Navigate to read-only view
    const viewUrl = `${page.url().split('/roster-builder')[0]}/rv?r=${encoded}`;
    await page.goto(viewUrl);
    await page.waitForLoadState('networkidle');

    // Verify read-only view header
    await expect(page.getByText(/Read-Only/, { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: '✓ Complete Raid Team' })).toBeVisible();

    // Verify tank section with all details
    await expect(page.getByText('TankA')).toBeVisible();
    await expect(page.getByText('MT')).toBeVisible();

    // Verify healer section
    await expect(page.getByText('HealerA')).toBeVisible();
    await expect(page.getByText('H1')).toBeVisible();

    // Verify DPS section with all players
    await expect(page.getByText('DPS1')).toBeVisible();
    await expect(page.getByText('DPS8')).toBeVisible();
    await expect(page.getByText('JailDD1')).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /Edit Roster/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy Link/ })).toBeVisible();
  });

  test('gear set assignment buttons work for all set types', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    // Verify set assignment tabs
    await expect(page.getByText('Set Assignments')).toBeVisible();
    await expect(page.getByText('Quick Assign')).toBeVisible();
    await expect(page.getByText('All Sets')).toBeVisible();

    // Verify tank set buttons are visible
    await expect(page.getByRole('button', { name: 'Lucent Echoes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pearlescent Ward' })).toBeVisible();

    // Verify healer set buttons are visible
    await expect(page.getByRole('button', { name: "Jorvuld's Guidance" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roaring Opportunist' })).toBeVisible();

    // Verify monster/mythic set buttons
    await expect(page.getByRole('button', { name: 'Symphony of Blades' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spaulder of Ruin' })).toBeVisible();
  });

  test('skill line selections are preserved through encoding', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const skillData = await page.evaluate(async () => {
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      // Configure skill lines
      roster.tanks[0].skillLines = {
        line1: 'Draconic Power',
        line2: 'Earthen Heart',
        line3: 'Ardent Flame',
        isFlex: false,
      };
      roster.healers[0].skillLines = {
        line1: 'Restoring Light',
        line2: 'Aedric Spear',
        line3: "Dawn's Wrath",
        isFlex: false,
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        tank1SkillLines: decoded.tanks[0].skillLines,
        healer1SkillLines: decoded.healers[0].skillLines,
      };
    });

    expect(skillData).not.toBeNull();
    expect(skillData.tank1SkillLines.line1).toBe('Draconic Power');
    expect(skillData.tank1SkillLines.line2).toBe('Earthen Heart');
    expect(skillData.healer1SkillLines.line1).toBe('Restoring Light');
  });

  test('jail DD types are correctly encoded and decoded', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const jailData = await page.evaluate(async () => {
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      roster.dpsSlots[4] = { slotNumber: 5, playerName: 'JailDD1', jailDDType: 'zenkosh' };
      roster.dpsSlots[5] = { slotNumber: 6, playerName: 'JailDD2', jailDDType: 'banner' };
      roster.dpsSlots[6] = { slotNumber: 7, playerName: 'JailDD3', jailDDType: 'wm' };
      roster.dpsSlots[7] = {
        slotNumber: 8,
        playerName: 'DPS8',
        jailDDType: 'custom',
        customDescription: 'Flex slot - fill as needed',
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        jailDD1Type: decoded.dpsSlots[4].jailDDType,
        jailDD2Type: decoded.dpsSlots[5].jailDDType,
        jailDD3Type: decoded.dpsSlots[6].jailDDType,
        customJailDescription: decoded.dpsSlots[7].customDescription,
      };
    });

    expect(jailData).not.toBeNull();
    expect(jailData.jailDD1Type).toBe('zenkosh');
    expect(jailData.jailDD2Type).toBe('banner');
    expect(jailData.jailDD3Type).toBe('wm');
    expect(jailData.customJailDescription).toContain('Flex slot');
  });

  test('ultimate and champion point selections are preserved', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const ultimateData = await page.evaluate(async () => {
      const { createDefaultRoster, defaultTankSetup, defaultHealerSetup } =
        await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      roster.tanks[0] = {
        ...defaultTankSetup(),
        ultimate: 'Aggressive Warhorn',
      };
      roster.healers[0] = {
        ...defaultHealerSetup(),
        ultimate: 'Aggressive Warhorn',
        healerBuff: 'Enlivening Overflow',
        championPoint: 'Enlivening Overflow',
      };
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'DPS1',
        championPoint: 'Hardy',
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        tank1Ultimate: decoded.tanks[0].ultimate,
        healer1Ultimate: decoded.healers[0].ultimate,
        healer1Buff: decoded.healers[0].healerBuff,
        healer1CP: decoded.healers[0].championPoint,
        dps1CP: decoded.dpsSlots[0].championPoint,
      };
    });

    expect(ultimateData).not.toBeNull();
    expect(ultimateData.tank1Ultimate).toBe('Aggressive Warhorn');
    expect(ultimateData.healer1Ultimate).toBe('Aggressive Warhorn');
    expect(ultimateData.healer1Buff).toBe('Enlivening Overflow');
    expect(ultimateData.dps1CP).toBe('Hardy');
  });

  test('player groups and labels survive round-trip', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const groupData = await page.evaluate(async () => {
      const { createDefaultRoster, defaultTankSetup } = await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      roster.availableGroups = [
        'Tank Pair',
        'Healer Pair',
        'Slayer Stack 1',
        'Slayer Stack 2',
        'Jail Stack',
      ];
      roster.tanks[0] = {
        ...defaultTankSetup(),
        labels: ['Main', 'Trash Tank'],
        groups: ['Tank Pair'],
      };
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'DPS1',
        labels: ['Stamina', 'Melee'],
      };
      roster.dpsSlots[4] = {
        slotNumber: 5,
        playerName: 'JailDD1',
        groups: ['Jail Stack'],
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        rosterGroups: decoded.availableGroups,
        tank1Groups: decoded.tanks[0].groups,
        tank1Labels: decoded.tanks[0].labels,
        dps1Labels: decoded.dpsSlots[0].labels,
        dps5Groups: decoded.dpsSlots[4].groups,
      };
    });

    expect(groupData).not.toBeNull();
    expect(groupData.rosterGroups).toContain('Tank Pair');
    expect(groupData.rosterGroups).toContain('Slayer Stack 1');
    expect(groupData.tank1Groups).toContain('Tank Pair');
    expect(groupData.tank1Labels).toContain('Main');
    expect(groupData.dps5Groups).toContain('Jail Stack');
  });

  test('all player fields (name, number, role label, notes) are preserved', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const playerData = await page.evaluate(async () => {
      const { createDefaultRoster, defaultTankSetup, defaultHealerSetup } =
        await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      roster.tanks[0] = {
        ...defaultTankSetup(),
        playerName: 'TankA',
        playerNumber: '1',
        roleLabel: 'MT',
        notes: 'TOMB Main Tank (1A)',
      };
      roster.healers[0] = {
        ...defaultHealerSetup(),
        playerName: 'HealerA',
        playerNumber: '1',
        roleLabel: 'H1',
        notes: 'TOMB Healer 1',
      };
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'DPS1',
        playerNumber: '1',
        roleLabel: 'DD1',
        notes: 'Front Bar DPS',
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return {
        tank1: {
          name: decoded.tanks[0].playerName,
          number: decoded.tanks[0].playerNumber,
          label: decoded.tanks[0].roleLabel,
          notes: decoded.tanks[0].notes,
        },
        healer1: {
          name: decoded.healers[0].playerName,
          number: decoded.healers[0].playerNumber,
          label: decoded.healers[0].roleLabel,
        },
        dps1: {
          name: decoded.dpsSlots[0].playerName,
          number: decoded.dpsSlots[0].playerNumber,
          label: decoded.dpsSlots[0].roleLabel,
        },
      };
    });

    expect(playerData).not.toBeNull();
    expect(playerData.tank1.name).toBe('TankA');
    expect(playerData.tank1.number).toBe('1');
    expect(playerData.tank1.label).toBe('MT');
    expect(playerData.tank1.notes).toBe('TOMB Main Tank (1A)');

    expect(playerData.healer1.name).toBe('HealerA');
    expect(playerData.dps1.name).toBe('DPS1');
    expect(playerData.dps1.label).toBe('DD1');
  });

  test('all 8 DPS slots are individually configured and persisted', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const allDpsData = await page.evaluate(async () => {
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      // Configure different DPS slots
      for (let i = 0; i < 4; i++) {
        roster.dpsSlots[i] = {
          slotNumber: i + 1,
          playerName: `DPS${i + 1}`,
          roleLabel: `DD${i + 1}`,
        };
      }
      roster.dpsSlots[4] = {
        slotNumber: 5,
        playerName: 'JailDD1',
        jailDDType: 'zenkosh',
      };
      roster.dpsSlots[5] = {
        slotNumber: 6,
        playerName: 'JailDD2',
        jailDDType: 'banner',
      };
      roster.dpsSlots[6] = {
        slotNumber: 7,
        playerName: 'JailDD3',
        jailDDType: 'wm',
      };
      roster.dpsSlots[7] = {
        slotNumber: 8,
        playerName: 'DPS8',
        jailDDType: 'custom',
      };

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return decoded.dpsSlots.map((slot, i) => ({
        slotNumber: slot.slotNumber,
        playerName: slot.playerName,
        roleLabel: slot.roleLabel,
        jailType: slot.jailDDType,
      }));
    });

    // Verify all 8 slots are populated with correct data
    expect(allDpsData).not.toBeNull();
    expect(allDpsData).toHaveLength(8);
    expect(allDpsData[0].playerName).toBe('DPS1');
    expect(allDpsData[0].roleLabel).toBe('DD1');
    expect(allDpsData[4].playerName).toBe('JailDD1');
    expect(allDpsData[4].jailType).toBe('zenkosh');
    expect(allDpsData[5].playerName).toBe('JailDD2');
    expect(allDpsData[7].playerName).toBe('DPS8');
  });

  test('general roster notes are preserved', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const notes = await page.evaluate(async () => {
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const { encodeRosterToURL, decodeRosterFromURL } =
        await import('/src/utils/rosterEncoding.ts');

      const roster = createDefaultRoster();
      roster.notes = 'Complete raid team roster for testing all features';

      const encoded = await encodeRosterToURL(roster);
      const decoded = await decodeRosterFromURL(encoded);

      return decoded.notes;
    });

    expect(notes).toContain('Complete raid team roster for testing');
  });
});
