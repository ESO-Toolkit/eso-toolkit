/**
 * Pack Sync Service — Cloudflare Workers RPC entrypoint
 *
 * Receives pack mutations from kalpa-pack-hub (KV-based) and
 * upserts them into the roster-hub D1 database so esotk.com
 * always reflects the latest pack data.
 *
 * Only published packs are synced. Draft packs are removed from D1
 * if they were previously published (handled by the caller).
 */

import { WorkerEntrypoint } from 'cloudflare:workers';

import type { Env } from './types';

export interface SyncPackData {
  id: string;
  title: string;
  description: string;
  pack_type: string;
  author_id: string;
  author_name: string;
  is_anonymous: boolean;
  addons: { esouiId: number; name: string; required?: boolean; note?: string }[];
  tags: string[];
}

export class PackSyncService extends WorkerEntrypoint<Env> {
  async syncPack(data: SyncPackData): Promise<void> {
    const db = this.env.DB;

    await db
      .prepare(
        `INSERT INTO packs (id, author_id, author_name, is_anonymous, title, description, pack_type, addons, vote_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           pack_type = excluded.pack_type,
           addons = excluded.addons,
           is_anonymous = excluded.is_anonymous,
           author_name = excluded.author_name,
           updated_at = datetime('now')`,
      )
      .bind(
        data.id,
        data.author_id,
        data.author_name,
        data.is_anonymous ? 1 : 0,
        data.title,
        data.description,
        data.pack_type,
        JSON.stringify(data.addons),
      )
      .run();

    await db.prepare('DELETE FROM pack_tags WHERE pack_id = ?').bind(data.id).run();
    if (data.tags.length > 0) {
      const stmts = data.tags.map((tag) =>
        db
          .prepare('INSERT OR IGNORE INTO pack_tags (pack_id, tag) VALUES (?, ?)')
          .bind(data.id, tag),
      );
      await db.batch(stmts);
    }
  }

  async removePack(id: string): Promise<void> {
    await this.env.DB.prepare('DELETE FROM packs WHERE id = ?').bind(id).run();
  }

  /**
   * Full reconciliation — upserts all published KV packs into D1.
   *
   * Called by kalpa-pack-hub's daily cron to heal drift from any
   * failed real-time syncs. Upsert-only: does not delete D1 packs
   * because we cannot distinguish KV-synced packs from packs
   * created natively through the esotk.com web UI.
   */
  async reconcile(
    published: SyncPackData[],
  ): Promise<{ synced: number; removed: number }> {
    for (const pack of published) {
      await this.syncPack(pack);
    }
    return { synced: published.length, removed: 0 };
  }
}
