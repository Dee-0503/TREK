import { concat, substring } from '../dialect/sql-functions';
import { addColumnIfMissing } from '../migration-utils';
import { Migration } from '@mikro-orm/migrations';

/** Adopts the saved-place identities written by the AMap development branch. */
export class Migration20261107000000_provider_neutral_place_identity extends Migration {
  override name = 'Migration20261107000000_provider_neutral_place_identity';

  override async up(): Promise<void> {
    await Promise.all(
      ['places', 'collection_places'].map(async (table) => {
        await addColumnIfMissing(this, table, 'provider', 'provider TEXT');
        await addColumnIfMissing(this, table, 'provider_place_id', 'provider_place_id TEXT');
        await this.execute(`
        UPDATE ${table} SET provider = 'google', provider_place_id = google_place_id
        WHERE provider IS NULL AND google_place_id IS NOT NULL AND trim(google_place_id) <> ''
          AND NOT (osm_id IS NOT NULL AND trim(osm_id) <> '')
      `);
        await this.execute(`
        UPDATE ${table} SET provider = 'google', provider_place_id = google_ftid
        WHERE provider IS NULL AND google_ftid IS NOT NULL AND trim(google_ftid) <> ''
          AND NOT (osm_id IS NOT NULL AND trim(osm_id) <> '')
      `);
        await this.execute(`
        UPDATE ${table} SET provider = 'osm', provider_place_id = osm_id
        WHERE provider IS NULL AND osm_id IS NOT NULL AND trim(osm_id) <> ''
          AND NOT (google_place_id IS NOT NULL AND trim(google_place_id) <> '')
          AND NOT (google_ftid IS NOT NULL AND trim(google_ftid) <> '')
      `);
      }),
    );

    const prefix = substring(this.driver.getPlatform(), 'provider_place_id', 1, 5);
    const prefixedId = concat(this.driver.getPlatform(), { value: 'amap:' }, { column: 'provider_place_id' });
    await this.execute(
      `
      UPDATE places SET amap_poi_id = CASE
        WHEN lower(${prefix.sql}) = 'amap:' THEN provider_place_id
        ELSE ${prefixedId.sql} END
      WHERE provider = 'amap' AND provider_place_id IS NOT NULL AND trim(provider_place_id) <> ''
        AND (amap_poi_id IS NULL OR trim(amap_poi_id) = '')
    `,
      [...prefix.params, ...prefixedId.params],
    );
    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_places_provider_identity ON places(provider, provider_place_id)',
    );
    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_collection_places_provider_identity ON collection_places(collection_id, provider, provider_place_id)',
    );
  }
}
