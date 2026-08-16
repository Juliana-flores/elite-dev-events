'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import EventCard from '../../../components/EventCard';
import Alert from '../../../components/Alert';
import { api, ApiClientError } from '../../../lib/api';

const STATUS_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Rascunhos (DRAFT)', value: 'DRAFT' },
  { label: 'Publicados (PUBLISHED)', value: 'PUBLISHED' },
];

function OrganizerEventsList() {
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState(
    createdId ? { type: 'success', message: 'Evento criado como Rascunho com sucesso!' } : null
  );

  const fetchOrganizerEvents = useCallback(async (currentStatus = statusFilter, currentPage = page) => {
    setIsLoading(true);

    try {
      const statusParam = currentStatus ? `&status=${currentStatus}` : '';
      const data = await api.get(`/organizer/events?page=${currentPage}&limit=20${statusParam}`);
      setEvents(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionFeedback({
          type: 'error',
          message: err.message || 'Erro ao carregar eventos do organizador.',
          details: err.details,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: 'Falha inesperada ao buscar eventos.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    let ignore = false;

    const runFetch = async () => {
      try {
        const statusParam = statusFilter ? `&status=${statusFilter}` : '';
        const data = await api.get(`/organizer/events?page=${page}&limit=20${statusParam}`);
        if (!ignore) {
          setEvents(data.items || []);
          setPagination(data.pagination || null);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setActionFeedback({
              type: 'error',
              message: err.message || 'Erro ao carregar eventos do organizador.',
              details: err.details,
            });
          } else {
            setActionFeedback({
              type: 'error',
              message: 'Falha inesperada ao buscar eventos.',
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
  }, [statusFilter, page]);

  const handlePublish = async (eventId) => {
    if (!confirm('Deseja publicar este evento? Uma vez publicado, ele ficará visível publicamente.')) {
      return;
    }

    try {
      await api.post(`/events/${eventId}/publish`);
      setActionFeedback({
        type: 'success',
        message: 'Evento publicado com sucesso! Ele agora está disponível para o público.',
      });
      fetchOrganizerEvents();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EVENT_ALREADY_PUBLISHED') {
          setActionFeedback({
            type: 'warning',
            message: 'Este evento já se encontra publicado.',
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          setActionFeedback({
            type: 'error',
            message: 'Não foi possível publicar o evento. Verifique se a data é futura e os dados estão preenchidos.',
            details: err.details,
          });
        } else {
          setActionFeedback({
            type: 'error',
            message: err.message || 'Erro ao publicar evento.',
            details: err.details,
          });
        }
      } else {
        setActionFeedback({
          type: 'error',
          message: 'Falha inesperada ao tentar publicar o evento.',
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Meus Eventos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gerencie seus rascunhos e eventos já publicados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/organizer/catalog"
            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Buscar no TMDb
          </Link>
          <Link
            href="/organizer/events/new"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            + Novo Evento
          </Link>
        </div>
      </div>

      {actionFeedback && (
        <Alert
          type={actionFeedback.type}
          message={actionFeedback.message}
          details={actionFeedback.details}
        />
      )}

      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-xs text-zinc-400">Carregando seus eventos...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <h3 className="text-base font-semibold text-white">Nenhum evento encontrado</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Você ainda não possui eventos com o filtro selecionado.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/organizer/catalog"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Pesquisar Filmes no TMDb
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isOrganizer
                onPublish={handlePublish}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
              >
                &larr; Anterior
              </button>
              <span className="text-xs text-zinc-400">
                Página {pagination.page} de {pagination.totalPages} ({pagination.totalItems} eventos)
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-30 hover:bg-zinc-700"
              >
                Próxima &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OrganizerEventsPage() {
  return (
    <AuthGuard allowedRoles={['ORGANIZER']}>
      <Suspense
        fallback={
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        }
      >
        <OrganizerEventsList />
      </Suspense>
    </AuthGuard>
  );
}
