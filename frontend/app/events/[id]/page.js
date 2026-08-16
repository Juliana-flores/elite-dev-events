'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Alert from '../../../components/Alert';
import { useAuth } from '../../../context/AuthContext';
import { api, ApiClientError } from '../../../lib/api';
import { formatDate, formatPrice } from '../../../lib/formatters';

export default function PublicEventDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const eventId = params.id;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  const handleReserve = async () => {
    setActionError(null);

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      setActionError(
        'Apenas usuários com perfil de Cliente (CUSTOMER) podem comprar ingressos.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const reservation = await api.createReservation(eventId, Number(quantity));
      router.push(`/checkout/${reservation.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EVENT_SOLD_OUT') {
          setActionError('Não há ingressos suficientes disponíveis para este evento.');
        } else if (err.code === 'EVENT_ALREADY_STARTED') {
          setActionError('Este evento já iniciou ou encerrou.');
        } else {
          setActionError(err.message || 'Não foi possível criar a reserva.');
        }
      } else {
        setActionError('Ocorreu um erro ao criar sua reserva.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const maxAvailable = event.availableTickets !== undefined ? Math.min(10, event.availableTickets) : 10;
  const unitPrice = parseFloat(event.price) || 0;
  const subtotal = (unitPrice * quantity).toFixed(2);

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
              {formatPrice(event.price)} <span className="text-xs font-normal text-zinc-400">/ ingresso</span>
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

          {/* Checkout & Reservation Section */}
          <div className="rounded-2xl border border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 p-6 shadow-xl backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Comprar Ingressos
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecione a quantidade de ingressos desejada
                </p>
              </div>

              {!isSoldOut && (
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Total Previsto</span>
                  <span className="text-lg font-extrabold text-emerald-400">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              )}
            </div>

            {actionError && <Alert type="error" message={actionError} />}

            {isSoldOut ? (
              <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 text-center">
                <p className="text-sm font-semibold text-rose-400">
                  Este evento está esgotado no momento.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="quantity" className="text-xs font-semibold text-zinc-300">
                    Quantidade:
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {Array.from({ length: maxAvailable }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'ingresso' : 'ingressos'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleReserve}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Gerando Reserva...</span>
                    </>
                  ) : (
                    <>
                      <span>🎟️</span>
                      <span>
                        {isAuthenticated
                          ? `Reservar ${quantity} ${quantity === 1 ? 'Ingresso' : 'Ingressos'}`
                          : 'Entrar para Comprar Ingressos'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
