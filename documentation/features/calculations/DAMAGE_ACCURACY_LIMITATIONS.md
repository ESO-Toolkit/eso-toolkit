# Damage Accuracy Analysis — Method & Limitations

_Last Updated: 2025-07-14_  
_Audience: Developers working on the damage accuracy engine_

---

## Overview

The damage accuracy system predicts what each damage event _should_ deal based on observable modifiers (penetration, critical damage, damage done%, tooltip scaling), then compares the prediction to the actual logged damage. The ratio `actual / predicted` tells us how well we model ESO's damage formula.

**Current accuracy**: ~87–90% across trial boss fights (Sanity's Edge Ansuul, Rockgrove Oaxiltso).

This document explains **why we use backward inference**, **what it can and cannot detect**, and **where the structural error floor comes from**.

---

## 1. The Backward Inference Method

### Why Backward?

ESO's full damage formula per hit is:

```
actual = tooltip × tooltipScaling × damageDone × (1 − damageReduction) × critMultiplier
```

Where `tooltip` is itself:

```
tooltip = coefficient × ( max(weaponDmg, spellDmg) + max(stamina, magicka) / 10.46 )
```

**We cannot compute `tooltip` forward** because the ESO Logs API provides:

| Data Point | Available? | Notes |
|---|---|---|
| Weapon / Spell Damage | ❌ | Not in any API field |
| Ability coefficient | ❌ | Game-internal, not exposed |
| Max Magicka / Stamina | ✅ | Via `sourceResources` per hit |
| Gear (id, quality, trait, set) | ✅ | Via `combatantInfo` |
| Buffs active per hit | ✅ | Via `event.buffs` array |
| Debuffs on target | ✅ | Via debuff apply/remove events |
| Champion Points (count only) | ✅ | No breakdown by star |
| Actual damage dealt | ✅ | The damage event itself |
| Hit type (crit/normal/etc.) | ✅ | `hitType` field |

Without weapon/spell damage and ability coefficients, we cannot compute the tooltip directly. Instead, we **infer the tooltip backward**:

```
inferredTooltip = actual / (tooltipScaling × damageDone × (1 − damageReduction) × critMultiplier)
```

We then compare each hit's inferred tooltip to a **median inferred tooltip** for that ability+player. The median serves as a proxy for the "true" base tooltip. If our modifiers are correct, every hit's inferred tooltip should equal the median — deviations indicate missing or incorrect modifiers.

### The Core Assumption

> If we correctly model every modifier, all inferred tooltips for the same ability converge to one value.

This assumption is what makes the system work, but it also creates a structural blind spot (see §3).

---

## 2. What We Track

### Modifiers Applied Per Hit

| Category | Sources Tracked | Method |
|---|---|---|
| **Penetration** | Major/Minor Breach, Alkosh, Crusher enchant, Pierce Armor, Tremorscale, status effect debuffs (8 types), CP stars | Target debuff lookup (timestamp-matched) |
| **Critical Damage** | Minor/Major Force, Martial Knowledge, Minor Brittle, CP stars (Fighting Finesse, Backstabber skeleton) | Attacker buff lookup (`event.buffs`) |
| **Damage Done %** | Minor/Major Berserk, Minor/Major Slayer, CP stars (Deadly Aim, Thaumaturge, Master-at-Arms, Biting Aura), Deadly Strike set | Attacker buff lookup (`event.buffs`) |
| **Tooltip Scaling** | Major/Minor Brutality/Sorcery (% WD/SD), Major/Minor Courage (flat WD/SD), Powerful Assault (flat) | Attacker buff lookup (`event.buffs`) |
| **Damage Reduction** | Target armor, Major/Minor Breach, Alkosh, Crusher, status debuffs → armor removed → mitigation % | Combined penetration + armor formula |

### Hardcoded Assumptions

| Constant | Value | Purpose |
|---|---|---|
| `ASSUMED_BASE_OFFENSIVE_STAT` | 5,500 | Stand-in for unknown weapon/spell damage |
| `ASSUMED_RESOURCE_CONTRIBUTION` | 3,442 | `max(stam,mag) / 10.46` typical trial DPS value |
| `TOOLTIP_INPUT_TOTAL` | 8,942 | Sum of the above two |
| Boss armor (trials) | 18,200 | Standard trial boss resistance |
| Penetration cap | 18,200 | ESO hard cap |
| Crit damage cap | 125% (bonus) | ESO hard cap |

These assumptions introduce irreducible inaccuracy (see §4).

---

## 3. The Blind Spot: Always-On Missing Sources

### The Problem

Backward inference compares inferred tooltips _relative to the median_. If a source is **always active** (100% uptime on every hit), it inflates the median tooltip uniformly. The accuracy metric shows 100% — but the median itself is wrong.

**Example**: If we fail to track a "+10% damage done" buff that is always active, every hit's predicted damage is 10% too low. But when we divide actual by predicted, every hit gets an inferred tooltip that's 10% too high. The median absorbs this — so every hit matches the (inflated) median perfectly. Accuracy reads 100%, but the absolute tooltip is wrong.

### What This Means

| Source Characteristic | Detectable? | Why |
|---|---|---|
| Intermittent buff (< 100% uptime) | ✅ Yes | Creates tooltip variance between hits with and without the buff |
| Always-on damage done % | ❌ No | Absorbed into median tooltip uniformly |
| Always-on penetration | ❌ No | Same — inflates all hits equally |
| Always-on tooltip scaling | ❌ No | Same |
| Crit damage sources | ✅ **Always** | Every ability has both crit and non-crit hits — built-in control group |

### The Crit Exception

Crit damage modifiers are **always detectable** regardless of uptime because ESO provides `hitType` per event. Non-crit hits use `critMultiplier = 1.0`, while crit hits use the full multiplier. This creates an automatic A/B test:

- If we have the crit multiplier right, non-crit and crit hits produce the **same** inferred tooltip
- If we're missing a crit source, crit hits produce a **higher** inferred tooltip (because we under-divided)
- If we have a phantom crit source, crit hits produce a **lower** inferred tooltip (because we over-divided)

The `trace-ability-hits.ts` script includes a **Crit vs Non-Crit Split Detector** that flags deviations > 2% between crit and non-crit median tooltips, with direction and magnitude.

---

## 4. Structural Error Floor

Even with every modifier perfectly tracked, several factors prevent 100% accuracy:

### 4a. Weapon/Spell Damage Unknown

The `ASSUMED_BASE_OFFENSIVE_STAT` of 5,500 is a rough average. Real values vary by:
- Build (stamina vs magicka)
- Gear sets that grant flat WD/SD
- Enchantment procs
- Potion uptime (Spell Power / Weapon Power)
- Race passives

A ±500 WD/SD error on a base of 5,500 is ~9% error on the WD component, which is ~3–4% error on the total tooltip input (`WD + mag/10.46`).

### 4b. Resource Fluctuation

`maxStamina` and `maxMagicka` fluctuate during combat due to:
- Aggressive Horn (+10% max resources)
- Food/drink effects wearing off
- Other group buffs

We track tooltip scaling buffs (Brutality, Sorcery, Courage) but the **underlying resource base** changes too. Observed: player 4 maxStamina ranged 31,697–34,745 (~9.6% swing).

We use `sourceResources` per hit to capture the current stamina/magicka, but without knowing weapon damage at that instant, we can't disentangle the tooltip properly.

### 4c. Ability Coefficients

Different abilities have different coefficients. Without knowing them, we cannot:
- Compare tooltips across abilities (an ability with coefficient 1.2 will always have a higher tooltip than one with 0.8)
- Validate absolute tooltip values

We work around this by computing accuracy **per ability** — the coefficient cancels out when comparing hits of the same ability.

### 4d. Stat-Based Set Bonuses

Some gear sets grant flat stats (weapon damage, spell damage, max resources) rather than damage% multipliers. These bonuses are **baked into the tooltip** before any multipliers apply. Since we don't know the tooltip, we can't separate these from the base stats.

**Example**: Cryptcanon Vestments grants stats but doesn't appear in `event.buffs` per hit. It shows as an aura in `combatantInfo` but its effect is invisible to our per-hit analysis.

### 4e. Source-Restricted Debuffs

Some debuffs only increase damage taken **from the player who applied them**:
- Way of Martial Knowledge (+8% from applier only)
- Incapacitating Strike (+20% from applier only)

These require tracking `sourceID` on the debuff and only applying the bonus when the damage event's source matches. We don't currently implement this.

### Estimated Error Floor: ~3–5%

Combining WD/SD uncertainty (~3–4%), resource fluctuation (~1–2%), and rounding, we estimate a hard floor of **3–5% median absolute error** even with perfect modifier tracking. The current ~10–13% gap suggests ~5–8% of error comes from untracked modifiers (see §5).

---

## 5. Known Untracked Modifiers

As of the latest audit (2025-07-14), these modifiers appear in our test fights but are not yet tracked:

| Source | Ability ID | Type | Value | SE Coverage | RG Coverage |
|---|---|---|---|---|---|
| Standard of Might | 32950 | Attacker buff (+dmg done) | +15% | 7.6% of hits | 5.9% |
| Aura of Pride | 163401 | Group buff (+dmg done) | +2–6% (per Crux) | 63.2% of hits | 0% |
| WMK debuff | 127070 | Target debuff (source-restricted) | +8% from applier | 52% of P8 hits | 0% |
| Incapacitating Strike | 61400 | Target debuff (source-restricted) | +20% from applier | 125 hits (P15) | 0% |
| Minor Berserk alt ID | 80471 | Alternate ability ID | +5% | 0% | 15.8% |

**Impact estimate**: Implementing these (especially Aura of Pride and Standard of Might) should reduce error by 2–4 percentage points.

---

## 6. Diagnostic Tools

### Crit vs Non-Crit Split Detector

Built into `scripts/trace-ability-hits.ts`. For a given ability+player:
1. Separates hits into crit and non-crit buckets
2. Computes median inferred tooltip for each bucket
3. Reports the ratio and flags deviations > 2%
4. Determines direction: "MISSING" (under-tracking crit) or "PHANTOM" (over-tracking crit)

**Usage**:
```bash
npm run script -- scripts/trace-ability-hits.ts <reportCode> <fightId> <abilityId> --player <id>
```

**Example finding**: Players 4 and 8 both show ~6.5% phantom crit source on ability 61927, suggesting the crit multiplier is systematically over-estimated by ~6.5%.

### Modifier-Group Tooltip Analysis

Also in `trace-ability-hits.ts`. Groups hits by unique modifier signature (penetration + damage done + tooltip scaling + crit multiplier), then compares median tooltips across groups. If two groups have identical tracked modifiers but different median tooltips (> 3% difference), an **untracked intermittent buff** is likely affecting one group.

### Systematic Bias

The trace script reports overall median signed error (systematic bias). Negative bias = over-prediction (our modifiers are too generous). Positive bias = under-prediction (missing modifiers).

---

## 7. Path Forward

### Short-Term (Implement Known Sources)
1. Add Standard of Might (32950) to `DAMAGE_DONE_BUFF_SOURCES`
2. Add Aura of Pride (163401) with per-Crux stacking logic
3. Add Minor Berserk alternate ID (80471) to existing source
4. Implement source-restricted debuff matching for WMK and Incapacitating Strike
5. Investigate the ~6.5% crit over-estimation (possible Minor Force timing or Major Force alternate ID)

### Medium-Term (Reduce Structural Error)  
6. Use `sourceResources` per hit to adjust resource contribution dynamically  
7. Detect potion uptime from buff events to improve WD/SD estimate  
8. Detect food/drink buffs for max resource baseline  
9. Implement Backstabber CP (requires actor position + facing angle math)

### Long-Term (If API Expands)
10. If ESO Logs ever exposes weapon/spell damage or ability tooltips directly, switch to forward computation  
11. Ability coefficient database (community-maintained) could enable cross-ability validation

---

## 8. Glossary

| Term | Definition |
|---|---|
| **Backward inference** | Dividing actual damage by known modifiers to recover the unknown tooltip |
| **Forward computation** | Computing expected damage from base stats × coefficient × modifiers (not possible today) |
| **Inferred tooltip** | The tooltip value derived by dividing out all known modifiers from actual damage |
| **Median tooltip** | Per-ability median of inferred tooltips; proxy for the "true" base tooltip |
| **Phantom source** | A modifier we track that isn't actually active, causing over-prediction |
| **Missing source** | A modifier we don't track that IS active, causing under-prediction |
| **Source-restricted debuff** | A debuff that only increases damage from the player who applied it |
| **Structural error floor** | Minimum achievable error due to unknown base stats (~3–5%) |
| **Split detector** | Tool that compares crit vs non-crit inferred tooltips to find crit-specific errors |
