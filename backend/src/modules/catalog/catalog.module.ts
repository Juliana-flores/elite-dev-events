import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CATALOG_PROVIDER } from './providers/catalog-provider.interface';
import { TmdbProvider } from './providers/tmdb.provider';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: CATALOG_PROVIDER,
      useClass: TmdbProvider,
    },
  ],
  exports: [CatalogService, CATALOG_PROVIDER],
})
export class CatalogModule {}
