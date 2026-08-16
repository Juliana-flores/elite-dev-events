'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Alert from '../../../components/Alert';
import { api, ApiClientError } from '../../../lib/api';
import { formatDate, formatPrice } from '../../../lib/formatters';

export default function PublicEventDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const eventId = params.id;

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true);
      setErrorState(null);

      try {
        const data = await api.get(`/events/${eventId}`);
        setEvent(data);
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.statusCode === 404 || err.code === 'EVENT_NOT_FOUND') {
            setErrorState({
              type: 'warning',
              message: 'Evento não encontrado ou ainda não publicado.',
            });
          } else {
            setErrorState({
              type: 'error',
              message: err.message || 'Erro ao carregar detalhes do evento.',
            });
          }
        } else {
          setErrorState({
            type: 'error',
            message: 'Falha inesperada ao buscar o evento.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-zinc-400">Carregando detalhes do evento...</p>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="mx-auto my-12 max-w-lg space-y-6 text-center">
        <Alert type={errorState.type} message={errorState.message} />
        <div>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            &larr; Voltar para a lista de eventos
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const isSoldOut = event.availableTickets !== undefined && event.availableTickets <= 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        &larr; Voltar para todos os eventos
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Poster */}
        <div className="md:col-span-1">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.title || 'Evento'}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
                priority
                unoptimized={!event.imageUrl.startsWith('https://image.tmdb.org')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-zinc-500">
                Sem imagem disponível
              </div>
            )}
          </div>
        </div>

        {/* Info & Details */}
        <div className="space-y-6 md:col-span-2">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {event.title}
            </h1>
            <p className="text-xl font-bold text-emerald-400">
              {formatPrice(event.price)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Data & Hora
              </span>
              <p className="mt-1 text-sm font-medium text-white">
                {formatDate(event.startsAt)}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Localização
              </span>
              <p className="mt-1 text-sm font-medium text-white">
                {event.location}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Disponibilidade
              </span>
              <p
                className={`mt-1 text-sm font-bold ${
                  isSoldOut ? 'text-rose-400' : 'text-indigo-400'
                }`}
              >
                {event.availableTickets !== undefined
                  ? isSoldOut
                    ? 'Ingressos Esgotados'
                    : `${event.availableTickets} de ${event.capacity} lugares`
                  : `Capacidade: ${event.capacity}`}
              </p>
            </div>
          </div>

          {event.description && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Sinopse / Sobre o Evento
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {/* Reservation Placeholder Banner (Conforms to Scope Constraints) */}
          <div className="rounded-2xl border border-indigo-900/40 bg-indigo-950/20 p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <span className="text-lg">🎟️</span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-indigo-200">
                  Reserva e Venda de Ingressos
                </h3>
                <p className="text-xs text-indigo-300/80 leading-relaxed">
                  O módulo de reservas e pagamentos será disponibilizado na próxima etapa do sistema conforme a especificação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
