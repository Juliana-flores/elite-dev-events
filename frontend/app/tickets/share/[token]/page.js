'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Alert from '../../../../components/Alert';
import QrCode from '../../../../components/QrCode';
import { api, ApiClientError } from '../../../../lib/api';
import { formatDate } from '../../../../lib/formatters';

export default function SharedTicketPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const shareToken = params.token;

  const [ticketData, setTicketData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSharedTicket = async () => {
      setIsLoading(true);
      setPageError(null);

      try {
        const response = await api.getSharedTicket(shareToken);
        if (isMounted) {
          setTicketData(response.ticket);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError && err.statusCode === 404) {
            setPageError('Ingresso compartilhado não encontrado ou link inválido.');
          } else {
            setPageError('Erro ao carregar o ingresso compartilhado.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (shareToken) {
      loadSharedTicket();
    }

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6 px-4">
      <div className="text-center space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          &larr; Conhecer a Elite Dev Events
        </Link>
      </div>

      {pageError && (
        <div className="space-y-4">
          <Alert type="error" message={pageError} />
          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-flex rounded-xl bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Ver Eventos Disponíveis
            </Link>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-xs text-zinc-400">Carregando ingresso compartilhado...</p>
          </div>
        </div>
      ) : ticketData ? (
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl backdrop-blur-xl">
          {/* Header Pass */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 p-6 text-white text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest bg-black/25 px-3 py-1 rounded-full inline-block">
              Ingresso Compartilhado
            </span>
            <h1 className="text-2xl font-black tracking-tight line-clamp-2">
              {ticketData.event?.title}
            </h1>
            <p className="text-xs text-indigo-100 font-medium">
              📅 {formatDate(ticketData.event?.startsAt)}
            </p>
          </div>

          {/* Event Poster Snapshot if present */}
          {ticketData.event?.imageUrl && (
            <div className="relative h-40 w-full overflow-hidden bg-zinc-950">
              <Image
                src={ticketData.event.imageUrl}
                alt={ticketData.event.title || 'Evento'}
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-cover opacity-60"
                unoptimized={!ticketData.event.imageUrl.startsWith('https://image.tmdb.org')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
            </div>
          )}

          {/* Ticket Body with QR Code */}
          <div className="p-6 space-y-6 text-center">
            <div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black tracking-wider uppercase ${
                  ticketData.status === 'VALID'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : ticketData.status === 'USED'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {ticketData.status === 'VALID'
                  ? '● Ingresso Válido'
                  : ticketData.status === 'USED'
                    ? '● Ingresso Já Utilizado'
                    : '● Ingresso Cancelado'}
              </span>
            </div>

            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <QrCode value={ticketData.qrPayload} size={220} />
              <p className="text-[11px] text-zinc-400">
                Apresente este QR Code na portaria do evento para acesso
              </p>
            </div>

            {/* Event Details Box */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                  Local do Evento:
                </span>
                <span className="text-sm font-semibold text-white">
                  📍 {ticketData.event?.location}
                </span>
              </div>

              <div className="border-t border-zinc-800 pt-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                  Data e Horário de Início:
                </span>
                <span className="text-sm font-semibold text-indigo-300">
                  {formatDate(ticketData.event?.startsAt)}
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
              Este ingresso foi gerado e compartilhado através da plataforma <span className="font-semibold text-zinc-400">Elite Dev Events</span>.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
