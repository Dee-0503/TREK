import { migrateToHead } from '../../../src/db/legacy-baseline';
import { Migration20261107000000_provider_neutral_place_identity as IdentityMigration } from '../../../src/db/migrations/Migration20261107000000_provider_neutral_place_identity';
import {
  createMigrationOrm,
  migrateTo,
  migratorOf,
  pendingNames,
  rawExec,
  rawQuery,
  runMigrationDirect,
} from '../../helpers/migration-step';
import type { MikroORM } from '@mikro-orm/sqlite';

import { describe, expect, it } from 'vitest';

const TARGET = 'Migration20261107000000_provider_neutral_place_identity';
const LEGACY_205 = 'Migration20200101032500_a_journal_entry_that_is_not_a';

async function seedOwner(orm: MikroORM): Promise<void> {
  await rawExec(orm, "INSERT INTO users (id, username, email, password_hash) VALUES (1, 'owner', 'owner@test', 'x')");
  await rawExec(orm, "INSERT INTO trips (id, user_id, title) VALUES (1, 1, 'Saved trip')");
  await rawExec(orm, "INSERT INTO collections (id, owner_id, name) VALUES (1, 1, 'Saved places')");
}

describe('provider-neutral saved-place identity migration', () => {
  it('upgrades the AMap branch at legacy 206 without skipping upstream 206 or losing saved identities and joins', async () => {
    const orm = await createMigrationOrm();
    try {
      await migrateTo(orm, LEGACY_205);
      await Promise.all(
        ['places', 'collection_places'].map(async (table) => {
          await rawExec(orm, `ALTER TABLE ${table} ADD COLUMN provider TEXT`);
          await rawExec(orm, `ALTER TABLE ${table} ADD COLUMN provider_place_id TEXT`);
        }),
      );
      await seedOwner(orm);
      await rawExec(orm, 'INSERT INTO days (id, trip_id, day_number) VALUES (1, 1, 1)');
      await rawExec(
        orm,
        `INSERT INTO places (id, trip_id, name, provider, provider_place_id) VALUES
          (1, 1, 'AMap stop', 'amap', 'B0LEGACY1')`,
      );
      await rawExec(orm, 'INSERT INTO day_assignments (id, day_id, place_id, order_index) VALUES (1, 1, 1, 0)');
      await rawExec(
        orm,
        `INSERT INTO collection_places (id, collection_id, owner_id, name, provider, provider_place_id)
          VALUES (1, 1, 1, 'Saved AMap stop', 'amap', 'B0SAVED1')`,
      );
      await rawExec(orm, 'INSERT INTO schema_version (version) VALUES (206)');
      await rawExec(orm, 'DELETE FROM mikro_orm_migrations');

      await migrateToHead(orm.em.getConnection(), migratorOf(orm));

      expect(await rawQuery(orm, "SELECT name FROM sqlite_master WHERE name = 'place_shadow_picks'")).toHaveLength(1);
      expect(
        await rawQuery(orm, "SELECT name FROM sqlite_master WHERE name = 'idx_place_shadow_created'"),
      ).toHaveLength(1);
      expect(await rawQuery(orm, 'SELECT provider, provider_place_id, amap_poi_id FROM places WHERE id = 1')).toEqual([
        { provider: 'amap', provider_place_id: 'B0LEGACY1', amap_poi_id: 'amap:B0LEGACY1' },
      ]);
      expect(await rawQuery(orm, 'SELECT provider, provider_place_id FROM collection_places WHERE id = 1')).toEqual([
        { provider: 'amap', provider_place_id: 'B0SAVED1' },
      ]);
      expect(await rawQuery(orm, 'SELECT day_id, place_id FROM day_assignments WHERE id = 1')).toEqual([
        { day_id: 1, place_id: 1 },
      ]);
      expect(await rawQuery(orm, 'SELECT collection_id, owner_id FROM collection_places WHERE id = 1')).toEqual([
        { collection_id: 1, owner_id: 1 },
      ]);
      expect(await rawQuery(orm, 'SELECT version FROM schema_version')).toEqual([{ version: 206 }]);
      expect(await pendingNames(orm)).toEqual([]);
      const recorded = await migratorOf(orm).getExecuted();
      await migrateToHead(orm.em.getConnection(), migratorOf(orm));
      expect(await migratorOf(orm).getExecuted()).toEqual(recorded);
    } finally {
      await orm.close(true);
    }
  }, 30_000);

  it('backfills unambiguous legacy identities, keeps feature ids and preserves an existing AMap id on replay', async () => {
    const orm = await createMigrationOrm();
    try {
      const names = await pendingNames(orm);
      await migrateTo(orm, names[names.indexOf(TARGET) - 1]);
      await seedOwner(orm);
      await rawExec(
        orm,
        `INSERT INTO places (id, trip_id, name, google_place_id, google_ftid, osm_id) VALUES
          (1, 1, 'Google feature', NULL, '0x123:0x456', NULL),
          (2, 1, 'Google preferred', 'ChIJpreferred', '0xother', NULL),
          (3, 1, 'Ambiguous', 'ChIJambiguous', NULL, 'node/42'),
          (4, 1, 'OSM', NULL, NULL, 'node/43')`,
      );
      await rawExec(
        orm,
        `INSERT INTO collection_places (id, collection_id, owner_id, name, google_ftid)
          VALUES (1, 1, 1, 'Saved feature', '0xabc:0xdef')`,
      );

      await migrateTo(orm, TARGET);

      expect(await rawQuery(orm, 'SELECT id, provider, provider_place_id FROM places ORDER BY id')).toEqual([
        { id: 1, provider: 'google', provider_place_id: '0x123:0x456' },
        { id: 2, provider: 'google', provider_place_id: 'ChIJpreferred' },
        { id: 3, provider: null, provider_place_id: null },
        { id: 4, provider: 'osm', provider_place_id: 'node/43' },
      ]);
      expect(await rawQuery(orm, 'SELECT provider, provider_place_id FROM collection_places WHERE id = 1')).toEqual([
        { provider: 'google', provider_place_id: '0xabc:0xdef' },
      ]);
      await rawExec(
        orm,
        `INSERT INTO places (id, trip_id, name, provider, provider_place_id, amap_poi_id) VALUES
          (5, 1, 'Existing AMap', 'amap', 'B0OLD', 'amap:B0CURRENT'),
          (6, 1, 'Prefixed AMap', 'amap', 'amap:B0PREFIXED', NULL)`,
      );
      await runMigrationDirect(orm, IdentityMigration);
      expect(
        await rawQuery(orm, 'SELECT id, provider_place_id, amap_poi_id FROM places WHERE id >= 5 ORDER BY id'),
      ).toEqual([
        { id: 5, provider_place_id: 'B0OLD', amap_poi_id: 'amap:B0CURRENT' },
        { id: 6, provider_place_id: 'amap:B0PREFIXED', amap_poi_id: 'amap:B0PREFIXED' },
      ]);
      expect(await rawQuery(orm, 'PRAGMA foreign_key_check')).toEqual([]);
    } finally {
      await orm.close(true);
    }
  }, 30_000);
});
