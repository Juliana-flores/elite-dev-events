'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Alert from '../../../components/Alert';
import AuthGuard from '../../../components/AuthGuard';
import { api, ApiClientError } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      setIsLoading(true);
      setPageError(null);

      try {
        const response = await api.getMyTickets(1, 50);
        if (isMounted) {
          setTickets(response.items || []);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError) {
            setPageError(err.message || 'Erro ao carregar ingressos.');
          } else {
            setPageError('Falha ao conectar com o servidor para buscar seus ingressos.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthGuard allowedRoles={['CUSTOMER']}>
      <div className="mx-auto max-w-4xl space-y-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Meus Ingressos
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Acesse e visualize seus ingressos com QR Code para validação na entrada
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Explorar mais eventos
          </Link>
        </div>

        {pageError && <Alert type="error" message={pageError} />}

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Buscando seus ingressos...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
            <div className="text-4xl">🎟️</div>
            <h3 className="text-base font-bold text-white">
              Nenhum ingresso encontrado
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Você ainda não possui ingressos comprados. Navegue pelos eventos em destaque e garanta sua vaga.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Ver Eventos Disponíveis
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg hover:border-zinc-700 transition-all"
              >
                <div className="flex gap-4 p-5">
                  {/* Poster Thumbnail */}
                  <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    {ticket.event?.imageUrl ? (
                      <Image
                        src={ticket.event.imageUrl}
                        alt={ticket.event.title || 'Evento'}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized={!ticket.event.imageUrl.startsWith('https://image.tmdb.org')}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                        🎟️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-white line-clamp-1">
                        {ticket.event?.title || 'Evento'}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ticket.status === 'VALID'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ticket.status === 'USED'
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {ticket.status === 'VALID'
                          ? 'VÁLIDO'
                          : ticket.status === 'USED'
                            ? 'UTILIZADO'
                            : 'CANCELADO'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400">
                      📅 {formatDate(ticket.event?.startsAt)}
                    </p>
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      📍 {ticket.event?.location}
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-5 py-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-zinc-500">
                    ID: {ticket.id.slice(0, 8)}...
                  </span>

                  <Link
                    href={`/me/tickets/${ticket.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    <span>Ver QR Code</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
