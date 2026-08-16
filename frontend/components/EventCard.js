'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDate, formatPrice, formatEventStatus } from '../lib/formatters';

export default function EventCard({ event, isOrganizer = false, onPublish }) {
  const {
    id,
    title,
    imageUrl,
    startsAt,
    location,
    price,
    capacity,
    availableTickets,
    status,
  } = event;

  const statusInfo = formatEventStatus(status);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700 hover:shadow-xl">
      <div className="relative aspect-[16/9] w-full bg-zinc-800 overflow-hidden sm:aspect-[2/1]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || 'Evento'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            unoptimized={!imageUrl.startsWith('https://image.tmdb.org')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-xs text-zinc-500">
            Sem imagem
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-2">
          {status && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 justify-between">
        <div className="space-y-2.5">
          <h3 className="text-lg font-bold text-white line-clamp-1" title={title}>
            {title}
          </h3>

          <div className="space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">📅</span>
              <span>{formatDate(startsAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">📍</span>
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-emerald-400">
                {formatPrice(price)}
              </span>
              {availableTickets !== undefined ? (
                <span
                  className={`text-[11px] font-medium ${
                    availableTickets > 0 ? 'text-zinc-300' : 'text-rose-400'
                  }`}
                >
                  {availableTickets > 0
                    ? `${availableTickets} disponíveis`
                    : 'Esgotado'}
                </span>
              ) : capacity ? (
                <span className="text-[11px] text-zinc-400">
                  Capacidade: {capacity}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-zinc-800/80 pt-4">
          {isOrganizer ? (
            <div className="flex items-center gap-2">
              {status === 'DRAFT' ? (
                <>
                  <Link
                    href={`/organizer/events/${id}/edit`}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-center text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    Editar
                  </Link>
                  {onPublish && (
                    <button
                      type="button"
                      onClick={() => onPublish(id)}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
                    >
                      Publicar
                    </button>
                  )}
                </>
              ) : (
                <Link
                  href={`/events/${id}`}
                  className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/40 py-2 text-center text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition-colors"
                >
                  Ver Página Pública
                </Link>
              )}
            </div>
          ) : (
            <Link
              href={`/events/${id}`}
              className="block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
            >
              Ver Detalhes
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
