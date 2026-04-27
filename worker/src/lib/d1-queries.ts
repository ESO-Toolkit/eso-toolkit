import { D1_BUILD_STATS_LIMIT } from '../config';
import type { BuildStatRow, ExtractedIntent, KnowledgeDocRow } from '../types';

export const queryBuildStats = async (
  db: D1Database,
  intent: ExtractedIntent,
): Promise<BuildStatRow[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (intent.weapons.length > 0) {
    const placeholders = intent.weapons.map(() => '?').join(', ');
    conditions.push(`weapon_combo IN (${placeholders})`);
    params.push(...intent.weapons);
  }

  if (intent.roles.length > 0) {
    const placeholders = intent.roles.map(() => '?').join(', ');
    conditions.push(`role IN (${placeholders})`);
    params.push(...intent.roles);
  }

  if (intent.classes.length > 0) {
    const placeholders = intent.classes.map(() => '?').join(', ');
    conditions.push(`class IN (${placeholders})`);
    params.push(...intent.classes);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `SELECT * FROM build_stats ${where} ORDER BY usage_count DESC LIMIT ?`;
  params.push(String(D1_BUILD_STATS_LIMIT));

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<BuildStatRow>();

  return result.results;
};

export const queryKnowledgeDocsById = async (
  db: D1Database,
  vectorizeIds: string[],
): Promise<KnowledgeDocRow[]> => {
  if (vectorizeIds.length === 0) return [];

  const placeholders = vectorizeIds.map(() => '?').join(', ');
  const sql = `SELECT * FROM knowledge_docs WHERE vectorize_id IN (${placeholders})`;

  const result = await db
    .prepare(sql)
    .bind(...vectorizeIds)
    .all<KnowledgeDocRow>();

  return result.results;
};

export const keywordSearchKnowledgeDocs = async (
  db: D1Database,
  keywords: string[],
  limit = 5,
): Promise<KnowledgeDocRow[]> => {
  if (keywords.length === 0) return [];

  const conditions = keywords.map(() => '(title LIKE ? OR content LIKE ?)');
  const params = keywords.flatMap((k) => {
    const term = `%${k}%`;
    return [term, term];
  });

  const sql = `SELECT * FROM knowledge_docs WHERE ${conditions.join(' OR ')} LIMIT ?`;
  params.push(String(limit));

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<KnowledgeDocRow>();

  return result.results;
};

export const upsertBuildStats = async (
  db: D1Database,
  rows: BuildStatRow[],
): Promise<number> => {
  let inserted = 0;

  for (const row of rows) {
    await db
      .prepare(
        `INSERT INTO build_stats (weapon_combo, role, class, front_bar_enchant, back_bar_enchant, front_bar_trait, back_bar_trait, usage_count, avg_parse_score, patch_version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT (weapon_combo, role, class, patch_version)
         DO UPDATE SET
           front_bar_enchant = excluded.front_bar_enchant,
           back_bar_enchant = excluded.back_bar_enchant,
           front_bar_trait = excluded.front_bar_trait,
           back_bar_trait = excluded.back_bar_trait,
           usage_count = excluded.usage_count,
           avg_parse_score = excluded.avg_parse_score,
           updated_at = datetime('now')`,
      )
      .bind(
        row.weapon_combo,
        row.role,
        row.class,
        row.front_bar_enchant,
        row.back_bar_enchant,
        row.front_bar_trait,
        row.back_bar_trait,
        row.usage_count,
        row.avg_parse_score,
        row.patch_version,
      )
      .run();
    inserted++;
  }

  return inserted;
};
