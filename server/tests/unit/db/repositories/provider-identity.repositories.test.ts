import { CollectionPlaces } from '../../../../src/db/entities/CollectionPlaces.entity';
import { Collections } from '../../../../src/db/entities/Collections.entity';
import { DayAssignments } from '../../../../src/db/entities/DayAssignments.entity';
import { Places } from '../../../../src/db/entities/Places.entity';
import type { PlacesRepository } from '../../../../src/db/repositories/Places.repository';
import { shapePluginOutput } from '../../../../src/nest/plugins/protocol/output-contract';
import { createSnapshotTestDb } from '../../../helpers/db-mock';
import { makeCollection, makeCollectionPlace } from '../../../helpers/factories/collections';
import { makeDayAssignment } from '../../../helpers/factories/itinerary';
import { makePlace } from '../../../helpers/factories/places';
import { makeDay, makeTrip } from '../../../helpers/factories/trips';
import { makeUser } from '../../../helpers/factories/users';
import { resetTestDb } from '../../../helpers/test-db';
import { createTestOrm, type TestOrm } from '../../../helpers/test-orm';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const db = createSnapshotTestDb();
let t: TestOrm;

beforeAll(async () => {
  t = await createTestOrm(db);
});
beforeEach(() => {
  resetTestDb(db);
  t.clear();
});
afterAll(async () => {
  await t.close();
  db.close();
});

function placeInput(tripId: number): Parameters<PlacesRepository['insertPlace']>[0] {
  return {
    trip_id: tripId,
    name: 'Saved stop',
    description: null,
    lat: null,
    lng: null,
    address: null,
    category_id: null,
    price: null,
    currency: null,
    place_time: null,
    end_time: null,
    duration_minutes: 60,
    notes: null,
    image_url: null,
    google_place_id: null,
    google_ftid: null,
    osm_id: null,
    amap_poi_id: null,
    website: null,
    phone: null,
    transport_mode: 'walking',
    route_geometry: null,
    route_color: null,
    stop_type: null,
    fill_percent: null,
    email: null,
    opening_hours: null,
  };
}

describe('provider identity through the ORM repositories', () => {
  it('deduplicates namespaced trip ids without matching another provider or truncating Google feature ids', async () => {
    const { user } = await makeUser(t.orm);
    const trip = await makeTrip(t.orm, user.id);
    const places = t.repo(Places);
    const amap = await makePlace(t.orm, trip.id, {
      provider: 'amap',
      provider_place_id: 'shared',
      amap_poi_id: 'amap:shared',
      google_place_id: 'shared',
    });
    const google = await makePlace(t.orm, trip.id, {
      provider: 'google',
      provider_place_id: 'shared',
      google_place_id: 'shared',
    });
    const osm = await makePlace(t.orm, trip.id, { provider: 'osm', provider_place_id: 'shared', osm_id: 'shared' });
    const feature = await makePlace(t.orm, trip.id, { google_ftid: '0x123:0x456' });
    const legacy = await makePlace(t.orm, trip.id, { google_place_id: 'ChIJlegacy' });
    const legacyAmap = await makePlace(t.orm, trip.id, { amap_poi_id: 'B0RAW' });

    expect((await places.findDuplicateByExternalId(String(trip.id), 'amap:shared'))?.id).toBe(amap.id);
    expect((await places.findDuplicateByExternalId(String(trip.id), 'google:shared'))?.id).toBe(google.id);
    expect((await places.findDuplicateByExternalId(String(trip.id), 'osm:shared'))?.id).toBe(osm.id);
    expect((await places.findDuplicateByExternalId(String(trip.id), 'google:0x123:0x456'))?.id).toBe(feature.id);
    expect((await places.findDuplicateByExternalId(String(trip.id), 'ChIJlegacy'))?.id).toBe(legacy.id);
    expect((await places.findDuplicateByExternalId(String(trip.id), 'amap:B0RAW'))?.id).toBe(legacyAmap.id);
    expect(await places.findDuplicateByExternalId(String(trip.id), 'unknown:shared')).toBeUndefined();
  });

  it('deduplicates saved identities and scopes membership to the collections the caller can access', async () => {
    const { user } = await makeUser(t.orm);
    const collection = await makeCollection(t.orm, user.id);
    const other = await makeCollection(t.orm, user.id);
    const amap = await makeCollectionPlace(t.orm, collection.id, user.id, {
      provider: 'amap',
      provider_place_id: 'shared',
      google_place_id: 'shared',
    });
    const google = await makeCollectionPlace(t.orm, collection.id, user.id, {
      provider: 'google',
      provider_place_id: 'shared',
      google_place_id: 'shared',
    });
    const osm = await makeCollectionPlace(t.orm, collection.id, user.id, {
      provider: 'osm',
      provider_place_id: 'node/42',
      osm_id: 'node/42',
    });
    await makeCollectionPlace(t.orm, other.id, user.id, { provider: 'amap', provider_place_id: 'shared' });
    const collections = t.repo(Collections);
    const saved = t.repo(CollectionPlaces);

    expect((await collections.findDuplicateByExternalId(collection.id, 'amap:shared'))?.id).toBe(amap.id);
    expect((await collections.findDuplicateByExternalId(collection.id, 'google:shared'))?.id).toBe(google.id);
    expect((await collections.findDuplicateByExternalId(collection.id, 'osm:node/42'))?.id).toBe(osm.id);
    expect(
      await saved.searchMembership([collection.id], { provider: 'amap', provider_place_id: 'shared' }, 0.0001),
    ).toEqual([expect.objectContaining({ place_id: amap.id, collection_id: collection.id })]);
    expect(await saved.searchMembership([collection.id], { osm_id: 'node/42' }, 0.0001)).toEqual([
      expect.objectContaining({ place_id: osm.id, collection_id: collection.id }),
    ]);
    expect(await saved.searchMembership([], { provider: 'amap', provider_place_id: 'shared' }, 0.0001)).toEqual([]);
  });

  it('persists edits and reads identities in private route/dedup projections while keeping public shares unchanged', async () => {
    const { user } = await makeUser(t.orm);
    const trip = await makeTrip(t.orm, user.id);
    const day = await makeDay(t.orm, trip.id);
    const places = t.repo(Places);
    const input = {
      ...placeInput(trip.id),
      provider: 'amap',
      provider_place_id: 'B0INITIAL',
      amap_poi_id: 'amap:B0INITIAL',
    };
    const id = await places.insertPlace(input);
    await places.updatePlace(id, { ...input, provider_place_id: 'B0UPDATED', amap_poi_id: 'amap:B0UPDATED' });
    await places.updatePlace(id, {
      ...placeInput(trip.id),
      name: 'Edited without identity',
      amap_poi_id: 'amap:B0UPDATED',
    });
    const pair = { provider: 'amap', provider_place_id: 'B0UPDATED' };
    await makeDayAssignment(t.orm, day.id, id);

    expect(await places.findInTrip(id, trip.id)).toMatchObject(pair);
    expect(await places.listDedupInputs(String(trip.id))).toEqual([expect.objectContaining(pair)]);
    expect(await places.dedupCandidatesForTrip(trip.id)).toEqual([expect.objectContaining(pair)]);
    expect(await places.listImportable(trip.id)).toEqual([expect.objectContaining(pair)]);
    expect(await places.listByTripAndIds(trip.id, [id])).toEqual([expect.objectContaining(pair)]);
    expect(await t.repo(DayAssignments).listForDay(day.id)).toEqual([expect.objectContaining(pair)]);
    const [sharedPlace] = await places.listPublicForShare(trip.id);
    const [sharedAssignment] = await t.repo(DayAssignments).listPublicForShare([day.id]);
    expect(sharedPlace).not.toHaveProperty('provider');
    expect(sharedPlace).not.toHaveProperty('provider_place_id');
    expect(sharedAssignment).not.toHaveProperty('provider');
    expect(sharedAssignment).not.toHaveProperty('provider_place_id');
    const copiedId = await places.insertPlaceCopy({
      ...input,
      reservation_status: null,
      reservation_notes: null,
      reservation_datetime: null,
    });
    expect(await places.findRaw(copiedId)).toMatchObject({ provider: 'amap', provider_place_id: 'B0INITIAL' });
  });

  it('keeps saved identities in file imports, edits, list reads and copies back into a trip', async () => {
    const { user } = await makeUser(t.orm);
    const trip = await makeTrip(t.orm, user.id);
    const collection = await makeCollection(t.orm, user.id);
    const collections = t.repo(Collections);
    const saved = t.repo(CollectionPlaces);
    const input = {
      collection_id: collection.id,
      owner_id: user.id,
      saved_by: user.id,
      name: 'Saved AMap',
      description: null,
      lat: null,
      lng: null,
      address: null,
      category_id: null,
      price: null,
      currency: null,
      notes: null,
      image_url: null,
      provider: 'amap',
      provider_place_id: 'B0SAVED',
      google_place_id: null,
      google_ftid: null,
      osm_id: null,
      website: null,
      phone: null,
      status: 'idea',
      links: null,
    };
    const savedId = await saved.insertSavedPlace({ ...input, source_trip_id: null, source_place_id: null });
    await saved.updateFields(savedId, {
      provider: 'amap',
      provider_place_id: 'B0EDITED',
      google_place_id: null,
      google_ftid: null,
      osm_id: null,
    });
    const fileId = await collections.insertFilePlace({ ...input, sort_order: 1 });
    expect(await collections.findPlaceRowById(fileId)).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B0SAVED',
    });
    expect(await collections.listPlaceRows(collection.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: savedId,
          provider: 'amap',
          provider_place_id: 'B0EDITED',
          google_place_id: null,
          google_ftid: null,
          osm_id: null,
        }),
      ]),
    );
    const copy = await saved.findForCopy(savedId);
    if (!copy) throw new Error('saved place was not found');
    const { id, collection_id, ...place } = copy;
    expect(id).toBe(savedId);
    expect(collection_id).toBe(collection.id);
    const copiedId = await t
      .repo(Places)
      .insertFromCollectionPlace({ ...place, trip_id: trip.id, amap_poi_id: 'amap:B0EDITED' });
    expect(await t.repo(Places).findRaw(copiedId)).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B0EDITED',
      amap_poi_id: 'amap:B0EDITED',
    });
  });

  it('publishes the non-secret provider identity through the existing plugin place contract', () => {
    expect(
      shapePluginOutput('places.create', {
        id: 1,
        provider: 'amap',
        provider_place_id: 'B0PLUGIN',
        credential: 'withheld',
      }),
    ).toEqual({ id: 1, provider: 'amap', provider_place_id: 'B0PLUGIN' });
  });

  it('keeps delayed Google enrichment out of an AMap place and fills an unidentified Google identity atomically', async () => {
    const { user } = await makeUser(t.orm);
    const trip = await makeTrip(t.orm, user.id);
    const places = t.repo(Places);
    const amap = await makePlace(t.orm, trip.id, {
      provider: 'amap',
      provider_place_id: 'B0KEPT',
      amap_poi_id: 'amap:B0KEPT',
    });
    await places.backfillFtid(amap.id, '0xGoogle');
    await places.fillIfEmpty(amap.id, trip.id, {
      google_place_id: 'ChIJwrong',
      google_ftid: '0xWrong',
      provider: 'google',
      provider_place_id: 'ChIJwrong',
      address: 'Wrong address',
    });
    expect(await places.findRaw(amap.id)).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B0KEPT',
      amap_poi_id: 'amap:B0KEPT',
      google_place_id: null,
      google_ftid: null,
      address: null,
    });
    const officialAmap = await makePlace(t.orm, trip.id, { amap_poi_id: 'amap:B0OFFICIAL' });
    await places.backfillFtid(officialAmap.id, '0xWrong');
    await places.fillIfEmpty(officialAmap.id, trip.id, {
      google_place_id: 'ChIJwrong',
      provider: 'google',
      provider_place_id: 'ChIJwrong',
    });
    expect(await places.findRaw(officialAmap.id)).toMatchObject({
      provider: null,
      provider_place_id: null,
      google_place_id: null,
      google_ftid: null,
    });
    const google = await makePlace(t.orm, trip.id, { google_place_id: 'ChIJkept' });
    await places.backfillFtid(google.id, '0xFeature');
    expect(await places.findRaw(google.id)).toMatchObject({
      provider: 'google',
      provider_place_id: 'ChIJkept',
      google_ftid: '0xFeature',
    });
    await places.fillIfEmpty(google.id, trip.id, {
      provider: 'google',
      provider_place_id: 'ChIJother',
      google_ftid: '0xOther',
    });
    expect(await places.findRaw(google.id)).toMatchObject({ provider_place_id: 'ChIJkept', google_ftid: '0xFeature' });
    const missing = await makePlace(t.orm, trip.id);
    await places.fillIfEmpty(missing.id, trip.id, {
      provider: 'google',
      provider_place_id: 'ChIJfirst',
      google_place_id: 'ChIJfirst',
    });
    expect(await places.findRaw(missing.id)).toMatchObject({
      provider: 'google',
      provider_place_id: 'ChIJfirst',
      google_place_id: 'ChIJfirst',
    });
  });
});
