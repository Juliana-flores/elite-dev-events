'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Alert from '../../../../components/Alert';
import AuthGuard from '../../../../components/AuthGuard';
import QrCode from '../../../../components/QrCode';
import { api, ApiClientError } from '../../../../lib/api';
import { formatDate } from '../../../../lib/formatters';

export default function TicketDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const ticketId = params.id;

  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true);
      setPageError(null);

      try {
        const data = await api.getMyTicket(ticketId);
        setTicket(data);
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.statusCode === 404) {
            setPageError('Ingresso não encontrado.');
          } else if (err.statusCode === 403) {
            setPageError('Você não tem permissão para visualizar este ingresso.');
          } else {
            setPageError(err.message || 'Erro ao carregar ingresso.');
          }
        } else {
          setPageError('Falha ao conectar com o servidor.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  const handleCopyShareUrl = async () => {
    if (ticket?.shareUrl) {
      try {
        await navigator.clipboard.writeText(ticket.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback if clipboard API fails
      }
    }
  };

  return (
    <AuthGuard allowedRoles={['CUSTOMER']}>
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <Link
          href="/me/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          &larr; Voltar para Meus Ingressos
        </Link>

        {pageError && <Alert type="error" message={pageError} />}

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Carregando dados do ingresso...</p>
            </div>
          </div>
        ) : ticket ? (
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl backdrop-blur-xl">
            {/* Header Ticket Banner */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white text-center space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest bg-black/20 px-2.5 py-0.5 rounded-full inline-block">
                Elite Dev Events Pass
              </span>
              <h1 className="text-xl font-extrabold tracking-tight line-clamp-2">
                {ticket.event?.title}
              </h1>
              <p className="text-xs text-indigo-100 font-medium">
                {formatDate(ticket.event?.startsAt)}
              </p>
            </div>

            {/* Ticket Body with QR Code */}
            <div className="p-6 space-y-6 text-center">
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black tracking-wider uppercase ${
                    ticket.status === 'VALID'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : ticket.status === 'USED'
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {ticket.status === 'VALID'
                    ? '● Ingresso Válido'
                    : ticket.status === 'USED'
                      ? '● Utilizado'
                      : '● Cancelado'}
                </span>
              </div>

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <QrCode value={ticket.qrPayload || ticket.secureCode} size={200} />
                <p className="text-[11px] text-zinc-400">
                  Apresente este QR Code na portaria do evento
                </p>
              </div>

              {/* Secure Token & Details */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">
                    Código de Validação:
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-300">
                    {ticket.secureCode}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">
                    Local do Evento:
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">
                    {ticket.event?.location}
                  </span>
                </div>

                {ticket.validatedAt && (
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">
                      Validado em:
                    </span>
                    <span className="text-xs text-amber-400">
                      {formatDate(ticket.validatedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Shareable Link Section */}
              {ticket.shareUrl && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-400 block text-left">
                    Link de Compartilhamento
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={ticket.shareUrl}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-400 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
