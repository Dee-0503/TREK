import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

function columnNames(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info('${table}')`).all() as Array<{ name: string }>).map((column) => column.name);
}

describe('saved-place provider identity migrations', () => {
  it('runs the complete fresh schema chain and preserves trip/collection joins', () => {
    const db = freshDb();
    createTables(db);
    runMigrations(db);

    expect(columnNames(db, 'places')).toEqual(expect.arrayContaining(['provider', 'provider_place_id', 'google_place_id', 'google_ftid', 'osm_id']));
    expect(columnNames(db, 'collection_places')).toEqual(
      expect.arrayContaining(['provider', 'provider_place_id', 'google_place_id', 'google_ftid', 'osm_id']),
    );

    const userId = Number(db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('migration-user', 'migration@example.test', 'hash').lastInsertRowid);
    const tripId = Number(db.prepare('INSERT INTO trips (user_id, title) VALUES (?, ?)').run(userId, 'Migration trip').lastInsertRowid);
    const placeId = Number(db.prepare('INSERT INTO places (trip_id, name, provider, provider_place_id) VALUES (?, ?, ?, ?)').run(tripId, 'AMap place', 'amap', 'B0FFFAB6J2').lastInsertRowid);
    const collectionId = Number(db.prepare('INSERT INTO collections (owner_id, name) VALUES (?, ?)').run(userId, 'Migration collection').lastInsertRowid);
    const collectionPlaceId = Number(db.prepare('INSERT INTO collection_places (collection_id, owner_id, name, provider, provider_place_id) VALUES (?, ?, ?, ?, ?)').run(collectionId, userId, 'AMap saved place', 'amap', 'B0FFFAB6J2').lastInsertRowid);

    expect(db.prepare('SELECT p.provider, p.provider_place_id FROM places p JOIN trips t ON t.id = p.trip_id WHERE p.id = ?').get(placeId)).toEqual({
      provider: 'amap',
      provider_place_id: 'B0FFFAB6J2',
    });
    expect(db.prepare('SELECT cp.provider, cp.provider_place_id FROM collection_places cp JOIN collections c ON c.id = cp.collection_id WHERE cp.id = ?').get(collectionPlaceId)).toEqual({
      provider: 'amap',
      provider_place_id: 'B0FFFAB6J2',
    });

    db.close();
  });

  it('upgrades old schemas and backfills deterministic identities in both tables', () => {
    const reference = freshDb();
    createTables(reference);
    runMigrations(reference);
    const latestVersion = (reference.prepare('SELECT version FROM schema_version').get() as { version: number }).version;
    reference.close();

    const db = freshDb();
    db.exec(`
      CREATE TABLE schema_version (version INTEGER NOT NULL);
      INSERT INTO schema_version (version) VALUES (${latestVersion - 2});
      CREATE TABLE places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_place_id TEXT,
        google_ftid TEXT,
        osm_id TEXT
      );
      CREATE TABLE collection_places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_place_id TEXT,
        google_ftid TEXT,
        osm_id TEXT
      );
    `);

    const insertPlace = db.prepare('INSERT INTO places (google_place_id, google_ftid, osm_id) VALUES (?, ?, ?)');
    const insertCollectionPlace = db.prepare('INSERT INTO collection_places (google_place_id, google_ftid, osm_id) VALUES (?, ?, ?)');
    insertPlace.run(' google-id ', null, null);
    insertPlace.run(null, 'ftid-fallback', null);
    insertPlace.run(null, null, 'osm-123');
    insertPlace.run('google-ambiguous', null, 'osm-ambiguous');
    insertCollectionPlace.run('collection-google', null, null);
    insertCollectionPlace.run(null, 'collection-ftid', null);
    insertCollectionPlace.run(null, null, 'collection-osm');
    insertCollectionPlace.run('collection-google-ambiguous', null, 'collection-osm-ambiguous');

    runMigrations(db);

    expect(columnNames(db, 'places')).toEqual(expect.arrayContaining(['provider', 'provider_place_id']));
    expect(columnNames(db, 'collection_places')).toEqual(expect.arrayContaining(['provider', 'provider_place_id']));
    expect(db.prepare('SELECT provider, provider_place_id FROM places ORDER BY id').all()).toEqual([
      { provider: 'google', provider_place_id: 'google-id' },
      { provider: 'google', provider_place_id: 'ftid-fallback' },
      { provider: 'osm', provider_place_id: 'osm-123' },
      { provider: null, provider_place_id: null },
    ]);
    expect(db.prepare('SELECT provider, provider_place_id FROM collection_places ORDER BY id').all()).toEqual([
      { provider: 'google', provider_place_id: 'collection-google' },
      { provider: 'google', provider_place_id: 'collection-ftid' },
      { provider: 'osm', provider_place_id: 'collection-osm' },
      { provider: null, provider_place_id: null },
    ]);

    // Re-running the append-only steps remains safe and does not overwrite identities.
    runMigrations(db);
    expect((db.prepare('SELECT version FROM schema_version').get() as { version: number }).version).toBe(latestVersion);
    db.close();
  });
});
