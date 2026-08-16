'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCard from '../components/EventCard';
import Alert from '../components/Alert';
import { api, ApiClientError } from '../lib/api';

export default function PublicEventsPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState({ message: '', details: [] });

  const fetchPublicEvents = useCallback(async (searchQuery = search, currentPage = page) => {
    setIsLoading(true);
    setErrorState({ message: '', details: [] });

    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
      const data = await api.get(`/events?page=${currentPage}&limit=12${searchParam}`);
      setEvents(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorState({
          message: err.message || 'Erro ao carregar eventos públicos.',
          details: err.details,
        });
      } else {
        setErrorState({
          message: 'Falha inesperada ao conectar com o servidor.',
          details: [],
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let ignore = false;

    const runFetch = async () => {
      try {
        const searchParam = search ? `&search=${encodeURIComponent(search.trim())}` : '';
        const data = await api.get(`/events?page=${page}&limit=12${searchParam}`);
        if (!ignore) {
          setEvents(data.items || []);
          setPagination(data.pagination || null);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setErrorState({
              message: err.message || 'Erro ao carregar eventos públicos.',
              details: err.details,
            });
          } else {
            setErrorState({
              message: 'Falha inesperada ao conectar com o servidor.',
              details: [],
            });
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      ignore = true;
    };
  }, [search, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPublicEvents(search, 1);
  };

  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 p-8 sm:p-12">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <span>✨ Plataforma Oficial</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Sessões e Eventos Exclusivos
          </h1>
          <p className="text-sm text-zinc-300 sm:text-base leading-relaxed">
            Descubra exibições cinematográficas e eventos de tecnologia com ingressos verificados e controle de capacidade em tempo real.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-8 flex max-w-xl gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquise eventos por título..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </section>

      {errorState.message && (
        <Alert type="error" message={errorState.message} details={errorState.details} />
      )}

      {/* Events Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Eventos em Destaque
          </h2>
          {pagination && (
            <span className="text-xs text-zinc-400">
              {pagination.totalItems} evento(s) publicado(s)
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Carregando eventos disponíveis...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
              🎬
            </div>
            <h3 className="text-base font-semibold text-white">Nenhum evento publicado no momento</h3>
            <p className="mt-1 text-xs text-zinc-400">
              {search
                ? `Nenhum evento encontrado para "${search}".`
                : 'Fique atento! Novos eventos e sessões serão publicados em breve pelos organizadores.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-8">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchPublicEvents(search, newPage);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
                >
                  &larr; Anterior
                </button>
                <span className="text-xs text-zinc-400">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    fetchPublicEvents(search, newPage);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
                >
                  Próxima &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
