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
  it('runs the complete fresh schema chain without duplicate columns and preserves joins', () => {
    const db = freshDb();
    expect(() => {
      createTables(db);
      runMigrations(db);
    }).not.toThrow();

    const placesColumns = columnNames(db, 'places');
    const collectionPlacesColumns = columnNames(db, 'collection_places');
    expect(placesColumns).toEqual(expect.arrayContaining(['provider', 'provider_place_id', 'google_place_id', 'google_ftid', 'osm_id']));
    expect(collectionPlacesColumns).toEqual(
      expect.arrayContaining(['provider', 'provider_place_id', 'google_place_id', 'google_ftid', 'osm_id']),
    );
    expect(placesColumns.filter((column) => column === 'provider')).toHaveLength(1);
    expect(placesColumns.filter((column) => column === 'provider_place_id')).toHaveLength(1);
    expect(collectionPlacesColumns.filter((column) => column === 'provider')).toHaveLength(1);
    expect(collectionPlacesColumns.filter((column) => column === 'provider_place_id')).toHaveLength(1);

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
});
