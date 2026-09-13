import { describe, expect, it } from 'vitest';
import { createTestDb } from '../../helpers/test-db';
import { runMigrations } from '../../../src/db/migrations';

function rerunLatestMigration(db: ReturnType<typeof createTestDb>): void {
  const { version } = db.prepare('SELECT version FROM schema_version').get() as { version: number };
  db.prepare('UPDATE schema_version SET version = ?').run(version - 1);
  runMigrations(db);
}

describe('provider identity migration — Google feature ID fallback', () => {
  it('backfills legacy google_ftid rows for places and collection_places without breaking joins', () => {
    const db = createTestDb();
    try {
      const user = db
        .prepare("INSERT INTO users (username, email, password_hash) VALUES ('migration-user', 'migration@example.test', 'hash')")
        .run().lastInsertRowid as number;
      const trip = db
        .prepare("INSERT INTO trips (user_id, title) VALUES (?, 'Migration trip')")
        .run(user).lastInsertRowid as number;
      const day = db
        .prepare('INSERT INTO days (trip_id, day_number) VALUES (?, 1)')
        .run(trip).lastInsertRowid as number;
      const place = db
        .prepare("INSERT INTO places (trip_id, name, google_ftid, google_place_id) VALUES (?, 'Legacy Google place', '0x123:0x456', NULL)")
        .run(trip).lastInsertRowid as number;
      const assignment = db
        .prepare('INSERT INTO day_assignments (day_id, place_id, order_index) VALUES (?, ?, 0)')
        .run(day, place).lastInsertRowid as number;
      const collection = db
        .prepare("INSERT INTO collections (owner_id, name) VALUES (?, 'Migration collection')")
        .run(user).lastInsertRowid as number;
      const collectionPlace = db
        .prepare("INSERT INTO collection_places (collection_id, owner_id, name, google_ftid, google_place_id) VALUES (?, ?, 'Legacy collection place', '0xabc:0xdef', NULL)")
        .run(collection, user).lastInsertRowid as number;

      rerunLatestMigration(db);

      expect(db.prepare('SELECT provider, provider_place_id, google_place_id, google_ftid FROM places WHERE id = ?').get(place)).toEqual({
        provider: 'google',
        provider_place_id: '0x123:0x456',
        google_place_id: null,
        google_ftid: '0x123:0x456',
      });
      expect(db.prepare('SELECT provider, provider_place_id, google_place_id, google_ftid FROM collection_places WHERE id = ?').get(collectionPlace)).toEqual({
        provider: 'google',
        provider_place_id: '0xabc:0xdef',
        google_place_id: null,
        google_ftid: '0xabc:0xdef',
      });
      expect(db.prepare('SELECT day_id, place_id FROM day_assignments WHERE id = ?').get(assignment)).toEqual({
        day_id: day,
        place_id: place,
      });
      expect(db.prepare('SELECT collection_id, owner_id FROM collection_places WHERE id = ?').get(collectionPlace)).toEqual({
        collection_id: collection,
        owner_id: user,
      });
    } finally {
      db.close();
    }
  });

  it('prefers google_place_id and leaves Google plus OSM identities nullable', () => {
    const db = createTestDb();
    try {
      const user = db
        .prepare("INSERT INTO users (username, email, password_hash) VALUES ('migration-user-2', 'migration2@example.test', 'hash')")
        .run().lastInsertRowid as number;
      const trip = db
        .prepare("INSERT INTO trips (user_id, title) VALUES (?, 'Migration trip 2')")
        .run(user).lastInsertRowid as number;
      const preferred = db
        .prepare("INSERT INTO places (trip_id, name, google_place_id, google_ftid) VALUES (?, 'Preferred Google place', 'ChIJpreferred', '0xpreferred')")
        .run(trip).lastInsertRowid as number;
      const ambiguous = db
        .prepare("INSERT INTO places (trip_id, name, google_place_id, google_ftid, osm_id) VALUES (?, 'Ambiguous place', 'ChIJambiguous', '0xambiguous', 'node/42')")
        .run(trip).lastInsertRowid as number;

      rerunLatestMigration(db);

      expect(db.prepare('SELECT provider, provider_place_id FROM places WHERE id = ?').get(preferred)).toEqual({
        provider: 'google',
        provider_place_id: 'ChIJpreferred',
      });
      expect(db.prepare('SELECT provider, provider_place_id FROM places WHERE id = ?').get(ambiguous)).toEqual({
        provider: null,
        provider_place_id: null,
      });
    } finally {
      db.close();
    }
  });
});
