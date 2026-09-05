/**
 * Display helpers shared by every surface that names a trial chapter — the
 * chapter rail, the trial scrubber's preview bubble, the "Up next" hint, the
 * "Entering <area>" transition overlay, and the mobile chapter list.
 *
 * ESO Logs names trash pulls after their dominant enemy, which frequently
 * collides with boss names (a "Lylanar and Turlassil" trash pull right before
 * the Lylanar and Turlassil boss). Centralizing the "Trash · " disambiguation
 * here keeps every surface telling the same story.
 *
 * @module features/fight_replay/trial_chapters/chapterDisplay
 */

import { formatDurationMs } from '../utils/replayTime';

import type { TrialChapter } from './types';

/**
 * Human-readable chapter name, disambiguated for trash. Boss names pass
 * through untouched; trash gains a "Trash · " prefix so a trash pull that
 * shares its boss's name ("Up next: Lylanar and Turlassil") can't read as a
 * boss encounter.
 */
export function chapterDisplayName(chapter: Pick<TrialChapter, 'name' | 'kind'>): string {
  return chapter.kind === 'trash' ? `Trash · ${chapter.name}` : chapter.name;
}

/** Human-readable outcome for a chapter's status badge + aria label. */
export function chapterStatusLabel(
  chapter: Pick<TrialChapter, 'kind' | 'isKill' | 'isWipe' | 'bossPercentage'>,
): string {
  if (chapter.kind === 'trash') {
    return chapter.isWipe ? 'Wipe' : 'Cleared';
  }
  if (chapter.isKill) return 'Kill';
  if (chapter.bossPercentage != null) return `${chapter.bossPercentage}% left`;
  return 'Wipe';
}

/** m:ss for a duration in ms — the one timecode format every chapter surface uses. */
export const formatChapterDuration = formatDurationMs;
