# Calculation Knowledge Base

_Last Updated: 2025-10-28_  
_Audience: ESO Toolkit users who want to understand how the numbers are produced_

This guide explains the logic behind every calculated insight that appears in ESO Toolkit. Instead of diving into code or data structures, we describe how the app reads your combat log, what each metric is trying to show, and the assumptions that shape the result.

## How We Interpret Combat Logs

- **We replay the fight timeline.** Your log is streamed into a shared analysis worker that re-simulates each second of the encounter. Whenever possible we keep the timeline continuous so charts and tables line up with in-game events.
- **We separate “always on” from “moment to moment”.** Stats granted by gear, champion points, or passives are treated as your baseline. Temporary buffs, debuffs, and mechanics are layered on top so you can see when something actually affected the fight.
- **We follow ESO’s combat rules.** Examples include the 18,200 penetration cap, the 125% critical damage ceiling, and the “combat ends after 10 seconds of inactivity” rule that powers active percentage.
- **We prefer readable outputs.** Each calculator feeds data into UI panels, timelines, or tables. The formats differ, but the logic below matches what you see on screen.

## What Each Calculation Covers

| Insight | What You See | How We Work It Out |
| --- | --- | --- |
| **Actor positions** | Replay camera and movement trails | Rebuild a 240 Hz timeline of positions, smoothing gaps under five seconds and freezing the last known spot for longer breaks. |
| **Buff timelines** | Buff and debuff uptime references | Pair “gain” and “lose” events for each effect, assume it lasts to fight end if no removal appears, and allow overlapping applications. |
| **Critical damage** | Critical damage timeline & source table | Start from the 50% base, add permanent bonuses, then sample each second to add temporary sources and clamp at 125%. |
| **Damage reduction** | Armor & mitigation panel | Sum armor from gear/passives with active buffs/debuffs, then convert armor totals into mitigation percentages (≈1% per 660 armor, max 50%). |
| **Penetration** | Penetration panel & source list | Add static penetration to active buffs and enemy debuffs every second, capping at 18 200 and tracking time spent capped. |
| **Damage over time** | DPS timelines per player/target | Bucket outgoing damage into one-second slices, totaling per player and target to emphasize spikes and troughs. |
| **Active percentage** | Combat uptime % | Stitch damage events into activity windows and close them after ten idle seconds per ESO’s combat rule. |
| **Status effects** | Concussion/Chill/Burning etc. uptime | Clip curated effect intervals to fight bounds and compare time active versus fight length per target. |
| **Elemental weakness stacks** | Flame/Frost/Shock stack chart | Track start/stop points for each weakness and count simultaneous effects to report stack-level uptime. |
| **Touch of Z’en stacks** | Z’en helper panel | For each Z’en interval, count unique DOT abilities from the applier within a rolling three-second window and treat each as one stack (up to five). |
| **Stagger stacks** | Stone Giant uptime tracker | Simulate stack build/refresh from Stone Giant hits, letting stacks decay after six seconds without a refresh. |
| **Travel distance** | Movement summaries | Sum straight-line hops between subsequent position samples while ignoring sub-5 cm jitter. |
| **Scribing detections** | Signature script summaries | Compare ability timing against known signature patterns across damage, buff, and resource events. |

## Deep Dive: How Each Metric Is Calculated

### Actor Positions
- **What it tells you:** Where every player or NPC was throughout the encounter, so replays feel like a live fight.
- **How we calculate it:**
	- Gather every position-bearing event and convert it into x/y coordinates.
	- Insert samples on a fixed ~240 Hz grid; if the log skipped that instant we reuse the most recent coordinates.
	- If no update arrives for five seconds, we hold the last location (players) or temporarily hide the actor (minor NPCs) until a new sample appears.
- **Things to know:** Taunt markers follow the latest active taunt, and bosses start at full health if the game reports it. Extremely long fights may be thinned slightly to stay responsive.

### Buff & Debuff Timelines
- **What it tells you:** Exactly when an effect like Major Breach, Z’en, or a unique set bonus was active.
- **How we calculate it:**
	- Treat each apply event as the start of a timer and each remove event as its end.
	- If a remove never arrives, end the timer at the fight’s finish (or the last timestamp we have).
	- Allow multiple timers for the same effect so stacks or multi-target applications are captured.
- **Things to know:** Stack-based remove events don’t instantly end the effect; they simply reduce stacks. These timelines are the backbone for other calculators.

### Critical Damage
- **What it tells you:** Your crit damage multiplier over time and which sources contributed (gear, passives, debuffs on the boss, etc.).
- **How we calculate it:**
	- Build a baseline once from combatant information (race, gear traits, passives, champion points).
	- Every second, evaluate which buffs/debuffs are active and add their crit damage bonuses on top of the baseline.
	- Clamp the total at 125% and log whether the cap was hit that second.
- **Things to know:** Some effects are hard to detect (e.g., Backstabber CP) so they appear as inactive until we have reliable detection logic.

### Damage Reduction & Mitigation
- **What it tells you:** Your armor totals and the percentage of incoming damage you should be mitigating.
- **How we calculate it:**
	- Derive your starting armor from gear pieces, passives, and race.
	- Each second, add buffs that raise armor, subtract debuffs, and apply conditional modifiers (e.g., Bulwark when blocking).
	- Translate the total into mitigation using ESO’s conversion (armor ÷ 660 = mitigation %, capped at 50%).
- **Things to know:** Protection-style buffs stack separately in-game; we call them out when detected but focus on armor-derived mitigation for clarity.

### Penetration
- **What it tells you:** How much armor you strip from enemies and when you reach the 18,200 cap.
- **How we calculate it:**
	- Establish a static penetration baseline (sets, traits, passives, weapon type).
	- For each second, tally self-buffs (e.g., Minor Breach procs) and enemy debuffs currently affecting your chosen target.
	- Sum baseline + bonuses, cap at 18 200, and record how often the cap was reached.
- **Things to know:** Some sources rely on assumptions from the log (Splintered Secrets assumes two stacks; Force of Nature needs curated debuffs). We highlight these assumptions in the UI.

### Damage Over Time (DPS Timelines)
- **What it tells you:** Smoothed DPS curves for each player and target, great for spotting burn phases or lull periods.
- **How we calculate it:**
	- Choose a bucket size (1 000 ms by default).
	- Assign every outgoing damage event to the bucket covering its timestamp.
	- Sum damage per bucket for each player/target combination and compute averages and maxes for the view.
- **Things to know:** Players with no damage still show up with flat zero lines, so you can confirm they were inactive.

### Active Percentage
- **What it tells you:** The share of the fight where a player was actively dealing damage.
- **How we calculate it:**
	- Filter to damage events you dealt to enemies within fight bounds.
	- Merge consecutive events into a window as long as each new hit occurs within 10 seconds of the previous one.
	- When a gap exceeds 10 seconds, close the window and start a new one on the next hit; sum window lengths and divide by total fight time.
- **Things to know:** Only damage events count today. If you were supporting with non-damage actions, the percentage may look low even though you were busy.

### Status Effect Uptimes
- **What it tells you:** How consistently key status effects (Concussion, Burning, etc.) stayed on each target.
- **How we calculate it:**
	- Look up the start/end windows for each curated status effect on each target.
	- Clip the windows so they never extend outside the fight start/end.
	- Add up the clipped durations and divide by fight length to get percentages.
- **Monitored IDs:**
	- Buff-style statuses: Overcharged `178118`, Sundered `178123`, Concussion `95134`, Chill `95136`, Diseased `178127`.
	- Debuff-style statuses: Burning `18084`, Poisoned `21929`, Hemorrhaging `148801`.
- **Things to know:** We focus on curated effects that drive damage bonuses or mechanics. Others are ignored to keep the view uncluttered.

### Elemental Weakness Stacks
- **What it tells you:** When Flame, Frost, and Shock weakness debuffs overlapped, giving you one, two, or three stacks.
- **How we calculate it:**
	- Convert each weakness interval into “start” and “end” markers.
	- Traverse the timeline in order, counting how many weaknesses are active per target.
	- Whenever the count changes, record how long the previous stack level lasted and attribute the time to that stack tier.
- **Monitored IDs:** Flame Weakness `142610`, Frost Weakness `142652`, Shock Weakness `142653`.
- **Things to know:** We highlight the maximum stacks observed on any single target at a time. Multiple targets each sitting at one stack won’t appear as “three”.

### Touch of Z’en Stacks
- **What it tells you:** How many Z’en stacks you realistically maintained on the target.
- **How we calculate it:**
	- For each Z’en application, identify the most likely caster (the applier or someone dealing DOT damage within a five-second window).
	- Sample the fight every second; at each sample, count unique DOT abilities from that caster hitting the target within the past three seconds.
	- Map the count to stack numbers (min 0, max 5) and record the time spent at each stack level.
- **Monitored IDs:** Touch of Z’en debuff `126597`. Damage-over-time abilities are any hits flagged as `tick = true` in the log, so we automatically include the full DOT catalogue (e.g., Razor Caltrops `20930`, Barbed Trap `117809`, Wall of Elements morphs `39011/26869/26879/40252`, Endless Hail `32714`, Growing Swarm `123082`, Subterranean Assault `143944`, etc.). The UI exposes the exact ability IDs detected via the “DOTs contributing to stacks” list.
- **Things to know:** If the log can’t tie a DOT back to the applier, we may undercount stacks. Use the DOT list in the UI to audit coverage.

### Stagger Stacks (Stone Giant)
- **What it tells you:** Coverage of the Stagger debuff provided by Stone Giant.
- **How we calculate it:**
	- Treat each Stone Giant hit as adding one stack up to a maximum of three and resetting a six-second expiration timer.
	- If no hit lands before the timer elapses, reduce the stack count by one per expiration.
	- Record how long the target spent at each stack count as the fight progresses.
- **Monitored IDs:** Stone Giant damage `133027` feeds the stacking model.
- **Things to know:** Hits exactly at the end of the fight aren’t treated as refreshes to avoid exaggerating coverage.

### Player Travel Distance
- **What it tells you:** How far each player moved, useful for kiting assignments or positioning reviews.
- **How we calculate it:**
	- Sort position samples chronologically for each player.
	- Discard jumps under five centimeters to remove idle jitter.
	- Compute straight-line distance between remaining samples and accumulate totals, active movement duration, and average speed.
- **Things to know:** Only tracked players are included. If the log lacks coordinate data (rare), we skip entries to avoid misleading numbers.

### Scribing Detections
- **What it tells you:** Whether signature scripts or automated rotations were detected during the fight.
- **How we calculate it:**
	- Parse the fight into per-player timelines of casts, buffs, resource spikes, and other events.
	- Compare those timelines against a library of known script signatures (sequence, timing, ability mix).
	- When a match exceeds the confidence threshold, log the detection with supporting evidence for review.
- **Things to know:** The system reviews all event types (damage, healing, buffs, and resource changes) because some signatures only surface in less obvious event streams.

## When Numbers Might Look Off
- Missing fight bounds prevent several metrics from calculating; you’ll see empty panels in that case.
- If the log drops events (common on unstable connections), timelines can have brief gaps or lower-than-expected uptimes.
- Certain set bonuses or passives aren’t fully exposed in the log. When we rely on heuristics or assumptions, the UI labels them so you can double-check.

## Want to Suggest Improvements?
- Let us know if a calculation feels inaccurate or confusing. Include the fight link so we can replay the exact scenario.
- Feature requests—like documenting additional mechanics or support metrics—can be shared in Discord or filed on GitHub.
