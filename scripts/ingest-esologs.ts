/**
 * ESO Logs Ingestion Script
 *
 * Reads from data-downloads/esologs-snapshot.json, transforms raw records
 * into aggregated build_stats, and POSTs them to the worker's /api/eso-ingest endpoint.
 *
 * Expected input shape (esologs-snapshot.json):
 * [
 *   {
 *     "player_class": "nightblade",
 *     "role": "stamina dps",
 *     "front_bar_weapon": "dual wield",
 *     "back_bar_weapon": "bow",
 *     "front_bar_trait": "nirnhoned",
 *     "back_bar_trait": "infused",
 *     "front_bar_enchant": "absorb stamina",
 *     "back_bar_enchant": "weapon damage",
 *     "parse_score": 125000,
 *     "patch_version": "U44"
 *   },
 *   ...
 * ]
 *
 * Usage:
 *   npx tsx scripts/ingest-esologs.ts [--url http://localhost:8787] [--secret your-secret]
 */

interface RawEsoLog {
  player_class: string;
  role: string;
  front_bar_weapon: string;
  back_bar_weapon: string;
  front_bar_trait: string;
  back_bar_trait: string;
  front_bar_enchant: string;
  back_bar_enchant: string;
  parse_score: number;
  patch_version: string;
}

interface AggregatedStat {
  weapon_combo: string;
  role: string;
  class: string;
  front_bar_enchant: string;
  back_bar_enchant: string;
  front_bar_trait: string;
  back_bar_trait: string;
  usage_count: number;
  avg_parse_score: number;
  patch_version: string;
}

const BATCH_SIZE = 100;

const parseArgs = () => {
  const args = process.argv.slice(2);
  let url = 'http://localhost:8787';
  let secret = 'dev-secret-change-me';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) url = args[++i];
    if (args[i] === '--secret' && args[i + 1]) secret = args[++i];
  }

  return { url, secret };
};

const aggregate = (records: RawEsoLog[]): AggregatedStat[] => {
  const map = new Map<string, { total: number; count: number; stat: Omit<AggregatedStat, 'usage_count' | 'avg_parse_score'> }>();

  for (const rec of records) {
    const weaponCombo = `${rec.front_bar_weapon} / ${rec.back_bar_weapon}`;
    const key = `${weaponCombo}|${rec.role}|${rec.player_class}|${rec.patch_version}`;

    const existing = map.get(key);
    if (existing) {
      existing.total += rec.parse_score;
      existing.count += 1;
    } else {
      map.set(key, {
        total: rec.parse_score,
        count: 1,
        stat: {
          weapon_combo: weaponCombo,
          role: rec.role,
          class: rec.player_class,
          front_bar_enchant: rec.front_bar_enchant,
          back_bar_enchant: rec.back_bar_enchant,
          front_bar_trait: rec.front_bar_trait,
          back_bar_trait: rec.back_bar_trait,
          patch_version: rec.patch_version,
        },
      });
    }
  }

  return Array.from(map.values()).map(({ total, count, stat }) => ({
    ...stat,
    usage_count: count,
    avg_parse_score: Math.round(total / count),
  }));
};

const main = async () => {
  const { url, secret } = parseArgs();

  const fs = await import('fs');
  const path = await import('path');

  const snapshotPath = path.join(process.cwd(), 'data-downloads', 'esologs-snapshot.json');

  if (!fs.existsSync(snapshotPath)) {
    console.error(`Snapshot not found at ${snapshotPath}`);
    console.error('Place your ESO Logs export at data-downloads/esologs-snapshot.json');
    process.exit(1);
  }

  const raw: RawEsoLog[] = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  console.log(`Loaded ${raw.length} raw records`);

  const stats = aggregate(raw);
  console.log(`Aggregated into ${stats.length} build stat rows`);

  for (let i = 0; i < stats.length; i += BATCH_SIZE) {
    const batch = stats.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${url}/api/eso-ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Secret': secret,
      },
      body: JSON.stringify({ rows: batch }),
    });

    if (!res.ok) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, await res.text());
      continue;
    }

    const result = await res.json();
    console.log(`Batch ${i / BATCH_SIZE + 1}: upserted ${(result as { upserted: number }).upserted} rows`);
  }

  console.log('Ingestion complete');
};

main().catch(console.error);
