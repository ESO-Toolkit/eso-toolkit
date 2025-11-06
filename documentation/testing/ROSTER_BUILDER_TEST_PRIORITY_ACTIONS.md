# Roster Builder Test Priority Actions

**Quick Reference** | [Full Analysis](ROSTER_BUILDER_TEST_ANALYSIS.md)

**Current Status**: 55/70 passing (21% skipped) | **Grade: B+**

---

## 🔴 CRITICAL - Fix Before Production

### 1. Set Assignment Tests (4-6 hours)
**Current Problem**: Tests only verify buttons exist, not actual assignment
```typescript
// ❌ Current - weak test
test('should display tank set buttons', async ({ page }) => {
  await expect(yolnahkriin).toBeVisible();
});

// ✅ Needed - functional test
test('should assign set and verify in all UI locations', async ({ page }) => {
  await yolnahkriin.click();
  await page.getByRole('menuitem', { name: /Tank 1 - Set 1/ }).click();
  
  // Verify in assignment manager
  await expect(yolnahkriinButton).toHaveAttribute('variant', 'filled');
  
  // Verify in role card (Advanced mode)
  await page.getByRole('button', { name: /advanced mode/i }).click();
  const tank1Input = page.getByLabel(/Primary 5-Piece Set/i);
  await expect(tank1Input).toHaveValue(/Yolnahkriin/i);
  
  // Verify in Discord preview
  await page.getByRole('button', { name: /preview discord/i }).click();
  await expect(page.getByRole('dialog')).toContainText('Yolnahkriin');
});
```

**Files to Update**:
- `tests/roster-builder.spec.ts` - "Set Assignment Manager" section

---

### 2. DPS Configuration Tests (3-4 hours)
**Current Problem**: All 5 tests skipped
```typescript
test.describe.skip('DPS Configuration', () => {
  // Skip entire section: DPS configuration UI not yet visible in simple mode
```

**Action Required**:
1. Remove `.skip`
2. Add `await advancedModeButton.click()` before DPS tests
3. Update selectors to match actual DPS card structure
4. Test drag-and-drop reordering

**Files to Update**:
- `tests/roster-builder.spec.ts` - "DPS Configuration" section

---

### 3. Import/Export Tests (3-4 hours)
**Current Problem**: No functional testing of import/export
```typescript
// ❌ Current - weak test
test('should have export to Discord button', async ({ page }) => {
  await expect(exportButton).toBeVisible();
});

// ✅ Needed - functional test
test('should export roster and verify JSON structure', async ({ page }) => {
  // Set roster data
  await page.getByRole('textbox', { name: /roster name/i }).fill('Test');
  
  // Export and capture download
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export json/i }).click();
  const download = await downloadPromise;
  
  // Verify content
  const content = await fs.readFile(await download.path(), 'utf8');
  const roster = JSON.parse(content);
  expect(roster.rosterName).toBe('Test');
  expect(roster.dpsSlots).toHaveLength(8);
});
```

**Files to Update**:
- `tests/roster-builder.spec.ts` - "Import/Export Functionality" section

---

### 4. Validation Tests (2-3 hours)
**Current Problem**: 2/3 skipped, 1 has no assertions
```typescript
// ❌ Current - does nothing
test('should validate required fields before export', async ({ page }) => {
  await exportButton.click();
  await page.waitForTimeout(500); // Just waits!
});

// ✅ Needed - actual validation test
test('should show compatibility warning for conflicting sets', async ({ page }) => {
  await advancedModeButton.click();
  
  // Assign conflicting sets
  // (Implementation depends on validation rules in validateCompatibility())
  
  // Verify warning appears
  const warning = page.locator('[role="alert"]').filter({ 
    hasText: /warning|incompatible/i 
  });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText(/expected warning text/i);
});
```

**Files to Update**:
- `tests/roster-builder.spec.ts` - "Validation and Warnings" section

---

### 5. End-to-End Workflow Test (2-3 hours)
**Current Problem**: No complete user workflow tested
```typescript
test('complete roster creation and export workflow', async ({ page }) => {
  // 1. Name roster
  await page.getByRole('textbox', { name: /roster name/i }).fill('Sunspire');
  
  // 2. Quick Fill
  await page.getByRole('button', { name: /quick fill/i }).click();
  await page.getByRole('textbox', { name: /player names/i }).fill(
    'T1\nT2\nH1\nH2\nD1\nD2\nD3\nD4\nD5\nD6\nD7\nD8'
  );
  await page.getByRole('button', { name: /fill roster/i }).click();
  
  // 3. Assign sets in Advanced mode
  await page.getByRole('button', { name: /advanced mode/i }).click();
  // ... assign sets ...
  
  // 4. Verify Discord preview
  await page.getByRole('button', { name: /preview discord/i }).click();
  await expect(page.getByRole('dialog')).toContainText('Sunspire');
  
  // 5. Export and verify
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export json/i }).click();
  const download = await downloadPromise;
  // ... verify content ...
});
```

**Files to Create**:
- `tests/roster-builder-e2e.spec.ts` (new file)

---

## 🟡 IMPORTANT - Quality Improvements

### 6. Strengthen Ultimate/CP Tests (2 hours)
**Current Problem**: Tests click but don't verify assignment
```typescript
// ❌ Current - weak assertion
test('should allow selecting tank ultimate', async ({ page }) => {
  await colossus.click();
  await expect(colossus).toBeVisible(); // "just verify no crash"
});

// ✅ Needed - verify state change
test('should assign and toggle tank ultimate', async ({ page }) => {
  // Verify initial state
  await expect(colossus).toHaveAttribute('aria-pressed', 'false');
  
  // Click to select
  await colossus.click();
  await expect(colossus).toHaveAttribute('aria-pressed', 'true');
  
  // Verify in Advanced mode
  await page.getByRole('button', { name: /advanced mode/i }).click();
  const tank1Card = page.getByRole('region', { name: /Tank 1/i });
  await expect(tank1Card).toContainText('Colossus');
  
  // Toggle off
  await page.getByRole('button', { name: /simple mode/i }).click();
  await colossus.click();
  await expect(colossus).toHaveAttribute('aria-pressed', 'false');
});
```

**Files to Update**:
- `tests/roster-builder.spec.ts` - "Ultimate Quick Assign" section
- `tests/roster-builder.spec.ts` - "Healer Champion Points" section

---

### 7. Remove Conditional Assertions (2 hours)
**Current Problem**: Tests pass even when functionality fails
```typescript
// ❌ Current - conditional test
if (await option.count() > 0) {
  await option.first().click();
  await expect(input).toHaveValue(/Powerful Assault/);
} else {
  // Just verify field is interactive
  await expect(input).toBeVisible();
}

// ✅ Needed - deterministic test
await input.click();
await input.fill('Powerful Assault');

// Fail if option doesn't appear
await expect(page.locator('[role="option"]').first()).toBeVisible({ 
  timeout: 2000 
});

// Must find and select
const option = page.locator('[role="option"]').filter({ 
  hasText: /Powerful Assault/i 
});
await expect(option).toBeVisible();
await option.first().click();

// Must have correct value
await expect(input).toHaveValue(/Powerful Assault/);
```

**Files to Update**:
- `tests/roster-builder.spec.ts` - Tank Configuration tests 3-5
- `tests/roster-builder.spec.ts` - Healer Configuration tests 2-3

---

### 8. Add Test IDs to Components (2 hours)
**Current Problem**: Fragile selectors rely on structure/text
```typescript
// ❌ Current - fragile selectors
const tank1Section = page.locator('text="Tank 1"').locator('..');
const primarySetInput = tank1Section
  .locator('label:has-text("Primary 5-Piece Set")')
  .locator('~ div input')
  .first();

// ✅ Better - stable test IDs
const tank1Card = page.getByTestId('tank-1-card');
const primarySetInput = tank1Card.getByTestId('primary-set-input');
```

**Components to Update**:
- `src/components/SetAssignmentManager.tsx` - add `data-testid="set-button-{setName}"`
- `src/pages/RosterBuilderPage.tsx` - add `data-testid="tank-1-card"`, etc.

**Files to Update After**:
- `tests/roster-builder.spec.ts` - Update all selector strategies

---

### 9. Replace Arbitrary Waits (1-2 hours)
**Current Problem**: Tests slower than needed, hide timing bugs
```typescript
// ❌ Current - arbitrary wait
await page.waitForTimeout(1000);
await page.waitForTimeout(500);

// ✅ Better - condition-based wait
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 2000 });

// ✅ Or wait for specific condition
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
```

**Search and Replace**:
- Find: `waitForTimeout(1000)` → Replace with load state wait
- Find: `waitForTimeout(500)` → Replace with element visibility wait

---

## 🟢 OPTIONAL - Nice to Have

### 10. Un-skip Edge Cases (2 hours)
**Files**: `tests/roster-builder.spec.ts` - "Edge Cases" section

### 11. Enhance Discord Preview (1 hour)
Test markdown formatting, emoji, full roster data

### 12. Performance Benchmarks (2 hours)
Track Core Web Vitals, interaction timing

---

## Quick Implementation Checklist

### Week 1: Critical Issues
- [ ] Add 3-5 set assignment functional tests (Day 1-2)
- [ ] Un-skip and fix 5 DPS configuration tests (Day 2-3)
- [ ] Add export functional test with download verification (Day 3)
- [ ] Add import functional test with JSON parsing (Day 4)
- [ ] Rewrite 3 validation tests with actual assertions (Day 4)
- [ ] Create 1 end-to-end workflow test (Day 5)

### Week 2: Quality Improvements
- [ ] Strengthen 6 ultimate/CP tests (Day 1)
- [ ] Remove conditionals from 5 tank/healer tests (Day 1-2)
- [ ] Add test IDs to 8 key components (Day 2-3)
- [ ] Replace 20+ arbitrary waits (Day 3-4)
- [ ] Update selectors to use test IDs (Day 4-5)

### Week 3: Polish
- [ ] Un-skip edge case tests
- [ ] Add share link round-trip test
- [ ] Add import from log test (with mocking)
- [ ] Document test patterns in README

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Pass Rate** | 78% (55/70) | 100% (70/70) | 🔴 |
| **Skip Rate** | 21% (15/70) | 0% (0/70) | 🔴 |
| **Strong Assertions** | 35/70 (50%) | 70/70 (100%) | 🟡 |
| **End-to-End Tests** | 0 | 3+ | 🔴 |
| **Test Execution Time** | ~24s | ~15s | 🟢 |

---

## References

- **Full Analysis**: [ROSTER_BUILDER_TEST_ANALYSIS.md](ROSTER_BUILDER_TEST_ANALYSIS.md)
- **Jira Epic**: ESO-521 - Roster Builder Feature
- **Test Files**: 
  - `tests/roster-builder.spec.ts` (70 tests)
  - `tests/roster-builder.smoke.spec.ts` (5 tests)
- **Implementation**: `src/pages/RosterBuilderPage.tsx`, `src/components/SetAssignmentManager.tsx`

---

**Last Updated**: November 5, 2025  
**Priority**: HIGH - Complete before marking ESO-521 as "Done"  
**Estimated Total Effort**: 20-30 hours
