'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import MovieCard from '../../../components/MovieCard';
import Alert from '../../../components/Alert';
import { api, ApiClientError } from '../../../lib/api';

export default function CatalogSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorState, setErrorState] = useState({ message: '', details: [] });

  const searchMovies = async (searchQuery, pageNum = 1) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setErrorState({
        message: 'Por favor, digite ao menos 2 caracteres para pesquisar.',
        details: [],
      });
      return;
    }

    setIsLoading(true);
    setErrorState({ message: '', details: [] });

    try {
      const data = await api.get(
        `/catalog/movies?query=${encodeURIComponent(searchQuery.trim())}&page=${pageNum}`
      );
      setMovies(data.items || []);
      setPagination(data.pagination || null);
      setPage(pageNum);
      setHasSearched(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'CATALOG_PROVIDER_UNAVAILABLE') {
          setErrorState({
            message: 'O provedor externo TMDb está temporariamente indisponível. Tente novamente mais tarde.',
            details: [],
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          setErrorState({
            message: 'A consulta enviada é inválida.',
            details: err.details,
          });
        } else {
          setErrorState({
            message: err.message || 'Erro ao buscar filmes no catálogo.',
            details: err.details,
          });
        }
      } else {
        setErrorState({
          message: 'Falha inesperada na busca de filmes.',
          details: [],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchMovies(query, 1);
  };

  const handleSelectMovie = (movie) => {
    try {
      sessionStorage.setItem('selected_tmdb_movie', JSON.stringify(movie));
    } catch {
      // ignore
    }
    router.push(
      `/organizer/events/new?externalCatalogId=${encodeURIComponent(movie.externalId)}&title=${encodeURIComponent(movie.title)}`
    );
  };

  return (
    <AuthGuard allowedRoles={['ORGANIZER']}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Catálogo de Filmes (TMDb)
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pesquise no catálogo externo para selecionar um filme e iniciar a criação do evento.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:max-w-xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Interstellar, Batman, Avengers..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {errorState.message && (
          <Alert type="error" message={errorState.message} details={errorState.details} />
        )}

        {isLoading && (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Consultando TMDb via backend...</p>
            </div>
          </div>
        )}

        {!isLoading && hasSearched && movies.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400">Nenhum filme encontrado para &ldquo;{query}&rdquo;.</p>
            <p className="mt-1 text-xs text-zinc-500">Tente buscar por outros termos ou títulos originais.</p>
          </div>
        )}

        {!isLoading && movies.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {movies.map((movie) => (
                <MovieCard key={movie.externalId} movie={movie} onSelect={handleSelectMovie} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => searchMovies(query, page - 1)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
                >
                  &larr; Anterior
                </button>
                <span className="text-xs text-zinc-400">
                  Página {pagination.page} de {pagination.totalPages} ({pagination.totalItems} resultados)
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages || isLoading}
                  onClick={() => searchMovies(query, page + 1)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
                >
                  Próxima &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
