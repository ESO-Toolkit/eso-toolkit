/**
 * Auto-sort roster channels within a category by day-of-week and time.
 *
 * Parses day/time from channel names (e.g. "sun-9pm-vlc", "monday-1pm-vka")
 * and reorders them chronologically within their parent category.
 *
 * Channels without a parseable day/time sort to the end alphabetically.
 */

import { getGuildChannels } from '../discord.js';
import type { Env } from '../types.js';
import { parseChannelName } from './channel-name.js';
import type { Difficulty } from './channel-name.js';
import { listMappingsForGuild } from './kv.js';

// ── Day parsing ────────────────────────────────────────────────────────────

const DAY_ORDER: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

// Match time like "9pm", "10am", "1pm", "12am"
const TIME_RE = /(\d{1,2})(am|pm)/i;

interface ParsedSchedule {
  day: number;   // 0=Mon … 6=Sun
  minutes: number; // minutes since midnight (0–1439)
  difficulty: Difficulty | null;
  trialId: string | null;
  trainer: string | null;
}

/**
 * Try to extract day-of-week, time, difficulty, trial, and trainer
 * from a Discord channel name.
 *
 * Delegates to the shared parseChannelName() for structural parsing,
 * then converts to the schedule-oriented format used for sorting.
 *
 * Returns null if the name doesn't contain a recognisable schedule pattern.
 */
function parseScheduleFromName(name: string): ParsedSchedule | null {
  const parsed = parseChannelName(name);

  // Must have at least a day to be sortable
  if (!parsed.day) return null;

  const day = DAY_ORDER[parsed.day] ?? null;
  if (day === null) return null;

  // Convert time string to minutes since midnight
  let minutes = 0;
  if (parsed.time) {
    const timeMatch = parsed.time.match(TIME_RE);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const isPm = timeMatch[2].toLowerCase() === 'pm';
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      minutes = hour * 60;
    }
  }

  return {
    day,
    minutes,
    difficulty: parsed.difficulty,
    trialId: parsed.trialId,
    trainer: parsed.trainer,
  };
}

// ── Sort & reorder ─────────────────────────────────────────────────────────

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Sort all text channels within `categoryId` by day/time parsed from
 * their names, then apply the new positions via the Discord API.
 *
 * Runs as a fire-and-forget background task — errors are logged, not thrown.
 */
export async function sortCategoryChannels(
  env: Env,
  guildId: string,
  categoryId: string,
): Promise<void> {
  try {
    // Fetch guild channels and roster mappings in parallel
    const [allChannels, mappings] = await Promise.all([
      getGuildChannels(env, guildId),
      listMappingsForGuild(env, guildId),
    ]);

    // Build a set of channel IDs that the bot manages
    const rosterChannelIds = new Set(mappings.map((m) => m.channelId));

    // Filter to text channels in the target category
    const categoryChannels = allChannels.filter(
      (ch) => ch.parent_id === categoryId && ch.type === 0, // GUILD_TEXT
    );

    if (categoryChannels.length < 2) return; // nothing to sort

    // Parse schedules for roster channels only
    const entries = categoryChannels.map((ch) => ({
      channel: ch,
      isRoster: rosterChannelIds.has(ch.id),
      schedule: rosterChannelIds.has(ch.id) ? parseScheduleFromName(ch.name) : null,
    }));

    // Split into non-roster channels (pinned at top, keep current order)
    // and roster channels (sorted by day/time below them).
    // Roster channels without a schedule (e.g. "asap-vlc") sort to the
    // end of the roster group, alphabetically.
    const pinned = entries
      .filter((e) => !e.isRoster)
      .sort((a, b) => (a.channel.position ?? 0) - (b.channel.position ?? 0));

    const rosterEntries = entries.filter((e) => e.isRoster);
    rosterEntries.sort((a, b) => {
      // No schedule (e.g. "asap-vlc") → front of roster group
      if (a.schedule && b.schedule) {
        if (a.schedule.day !== b.schedule.day) return a.schedule.day - b.schedule.day;
        return a.schedule.minutes - b.schedule.minutes;
      }
      if (!a.schedule && b.schedule) return -1;
      if (a.schedule && !b.schedule) return 1;
      return a.channel.name.localeCompare(b.channel.name);
    });

    entries.length = 0;
    entries.push(...pinned, ...rosterEntries);

    // Check if the order actually changed — avoid unnecessary API calls
    const currentOrder = categoryChannels
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ch) => ch.id);
    const newOrder = entries.map((e) => e.channel.id);

    if (currentOrder.every((id, i) => id === newOrder[i])) return; // already sorted

    // Build position update payload
    const positions = entries.map((e, i) => ({
      id: e.channel.id,
      position: i,
      parent_id: categoryId,
    }));

    // Discord bulk channel position update
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
      body: JSON.stringify(positions),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[channel-sort] reorder failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('[channel-sort] error:', err);
  }
}

// Export for testing
export { parseScheduleFromName };
