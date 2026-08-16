import { Inject, Injectable } from '@nestjs/common';

import * as catalogProviderInterface from './providers/catalog-provider.interface';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(catalogProviderInterface.CATALOG_PROVIDER)
    private readonly catalogProvider: catalogProviderInterface.CatalogProvider,
  ) {}

  async searchMovies(
    query: string,
    page = 1,
  ): Promise<catalogProviderInterface.CatalogSearchResult> {
    return this.catalogProvider.searchMovies(query, page);
  }
}
