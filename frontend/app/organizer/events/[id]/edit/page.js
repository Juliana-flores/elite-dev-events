'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from '../../../../../components/AuthGuard';
import Alert from '../../../../../components/Alert';
import { api, ApiClientError } from '../../../../../lib/api';
import { formatDate, formatPrice, formatEventStatus } from '../../../../../lib/formatters';

export default function EditEventPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const eventId = params.id;
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [formData, setFormData] = useState({
    startsAt: '',
    location: '',
    capacity: 100,
    price: '0.00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const loadEvent = async () => {
      setIsLoading(true);
      try {
        // Fetch organizer events and find this event, or fetch directly
        const data = await api.get(`/organizer/events?limit=100`);
        const found = data.items?.find((item) => item.id === eventId);

        if (!found) {
          throw new ApiClientError({
            statusCode: 404,
            code: 'EVENT_NOT_FOUND',
            message: 'Evento não encontrado entre os seus eventos.',
          });
        }

        setEvent(found);
        // format ISO date to local input datetime format: YYYY-MM-DDTHH:mm
        let localDateStr = '';
        if (found.startsAt) {
          const d = new Date(found.startsAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          localDateStr = d.toISOString().slice(0, 16);
        }

        setFormData({
          startsAt: localDateStr,
          location: found.location || '',
          capacity: found.capacity || 100,
          price: String(found.price || '0.00'),
        });
      } catch (err) {
        if (err instanceof ApiClientError) {
          setFeedback({
            type: 'error',
            message: err.message || 'Erro ao carregar dados do evento.',
          });
        } else {
          setFeedback({
            type: 'error',
            message: 'Falha inesperada ao buscar o evento.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        startsAt: new Date(formData.startsAt).toISOString(),
        location: formData.location,
        capacity: Number(formData.capacity),
        price: String(formData.price),
      };

      const updated = await api.patch(`/events/${eventId}`, payload);
      setEvent(updated);
      setFeedback({
        type: 'success',
        message: 'Rascunho atualizado com sucesso!',
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EVENT_ALREADY_PUBLISHED') {
          setFeedback({
            type: 'warning',
            message: 'Este evento já foi publicado e não pode ser editado no MVP.',
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          setFeedback({
            type: 'error',
            message: 'Erro de validação ao atualizar.',
            details: err.details,
          });
        } else {
          setFeedback({
            type: 'error',
            message: err.message || 'Erro ao atualizar rascunho.',
            details: err.details,
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Falha inesperada ao atualizar evento.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Deseja publicar este evento agora?')) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await api.post(`/events/${eventId}/publish`);
      setFeedback({
        type: 'success',
        message: 'Evento publicado com sucesso! Redirecionando...',
      });
      setTimeout(() => {
        router.push('/organizer/events');
      }, 1200);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({
          type: 'error',
          message: err.message || 'Erro ao publicar evento.',
          details: err.details,
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Falha inesperada ao publicar.',
        });
      }
      setIsSubmitting(false);
    }
  };

  const statusInfo = event ? formatEventStatus(event.status) : null;
  const isDraft = event?.status === 'DRAFT';

  return (
    <AuthGuard allowedRoles={['ORGANIZER']}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Gerenciar Evento
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Edição de dados operacionais e publicação de evento.
            </p>
          </div>
          <Link
            href="/organizer/events"
            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            &larr; Voltar para Meus Eventos
          </Link>
        </div>

        {feedback && (
          <Alert type={feedback.type} message={feedback.message} details={feedback.details} />
        )}

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Carregando detalhes...</p>
            </div>
          </div>
        ) : !event ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-400">
            Evento não encontrado.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info snapshot */}
            <div className="flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:flex-row sm:items-start">
              {event.imageUrl && (
                <div className="relative aspect-[2/3] w-28 flex-shrink-0 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700">
                  <Image
                    src={event.imageUrl}
                    alt={event.title || 'Poster'}
                    fill
                    className="object-cover"
                    unoptimized={!event.imageUrl.startsWith('https://image.tmdb.org')}
                  />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-white">{event.title}</h2>
                  <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${statusInfo?.color}`}>
                    {statusInfo?.label}
                  </span>
                </div>
                {event.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {event.description}
                  </p>
                )}
                <div className="pt-2 text-xs text-zinc-500 font-mono">
                  ID: {event.id}
                </div>
              </div>
            </div>

            {!isDraft && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 text-xs text-amber-300">
                ⚠️ Este evento já está no status <strong>{event.status}</strong>. Conforme regras do MVP, dados operacionais não podem ser modificados após a publicação.
              </div>
            )}

            {/* Edit form */}
            <form onSubmit={handleUpdate} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
              <h3 className="text-base font-semibold text-white">Dados Operacionais do Evento</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Data e Hora de Início *
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    disabled={!isDraft || isSubmitting}
                    required
                    value={formData.startsAt}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Local / Sala *
                  </label>
                  <input
                    type="text"
                    name="location"
                    disabled={!isDraft || isSubmitting}
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Capacidade Total (Ingressos) *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    disabled={!isDraft || isSubmitting}
                    required
                    value={formData.capacity}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Preço do Ingresso (R$) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    disabled={!isDraft || isSubmitting}
                    required
                    value={formData.price}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between sm:items-center">
                {isDraft ? (
                  <>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>

                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Publicando...' : 'Publicar Evento Agora'}
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/events/${eventId}`}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    Visualizar Página Pública do Evento
                  </Link>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
