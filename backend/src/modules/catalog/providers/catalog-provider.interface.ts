export interface CatalogMovie {
  externalId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  releaseDate: string | null;
}

export interface CatalogPagination {
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface CatalogSearchResult {
  items: CatalogMovie[];
  pagination: CatalogPagination;
}

export interface CatalogProvider {
  searchMovies(query: string, page?: number): Promise<CatalogSearchResult>;
}

export const CATALOG_PROVIDER = 'CATALOG_PROVIDER';
