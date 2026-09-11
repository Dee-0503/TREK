import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { MapsMcp } from './maps.mcp';
import { PlacePhotosModule } from '../place-photos/place-photos.module';
import { StorageModule } from '../storage/storage.module';
import { ProviderRouter } from './providers/provider-router';

/**
 * Maps / geo domain (L3 leaf module). Registered in AppModule. Exports
 * MapsService for the in-container consumers (BookingImportModule's Nominatim
 * geocoding, PlacesModule's search_place tool and list-import enrichment).
 * Nothing outside the container consumes this domain, so there is no bridge.
 */
@Module({
  imports: [PlacePhotosModule, StorageModule],
  controllers: [MapsController],
  providers: [MapsService, MapsMcp, ProviderRouter],
  exports: [MapsService, ProviderRouter],
})
export class MapsModule {}
