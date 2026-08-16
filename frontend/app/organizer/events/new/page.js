'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AuthGuard from '../../../../components/AuthGuard';
import Alert from '../../../../components/Alert';
import { api, ApiClientError } from '../../../../lib/api';

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState(() => {
    const defaultData = {
      externalCatalogId: searchParams.get('externalCatalogId') || '',
      title: searchParams.get('title') || '',
      description: '',
      imageUrl: '',
      startsAt: '',
      location: '',
      capacity: 100,
      price: '0.00',
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('selected_tmdb_movie');
        if (stored) {
          const movie = JSON.parse(stored);
          return {
            ...defaultData,
            externalCatalogId: movie.externalId || defaultData.externalCatalogId,
            title: movie.title || defaultData.title,
            description: movie.description || '',
            imageUrl: movie.imageUrl || '',
          };
        }
      } catch {
        // ignore
      }
    }

    return defaultData;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState({ message: '', details: [] });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorState({ message: '', details: [] });

    try {
      const payload = {
        externalCatalogId: formData.externalCatalogId,
        title: formData.title,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        startsAt: new Date(formData.startsAt).toISOString(),
        location: formData.location,
        capacity: Number(formData.capacity),
        price: String(formData.price || '0.00'),
      };

      const createdEvent = await api.post('/events', payload);
      try {
        sessionStorage.removeItem('selected_tmdb_movie');
      } catch {
        // ignore
      }
      router.push(`/organizer/events?created=${createdEvent.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setErrorState({
            message: 'Erro de validação nos campos do evento.',
            details: err.details,
          });
        } else {
          setErrorState({
            message: err.message || 'Erro ao criar evento.',
            details: err.details,
          });
        }
      } else {
        setErrorState({
          message: 'Falha inesperada ao registrar evento.',
          details: [],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Criar Novo Evento
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            O evento será criado inicialmente no status <strong className="text-amber-400">Rascunho (DRAFT)</strong>.
          </p>
        </div>
        <Link
          href="/organizer/catalog"
          className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          &larr; Escolher outro filme
        </Link>
      </div>

      {errorState.message && (
        <Alert type="error" message={errorState.message} details={errorState.details} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
        <div className="border-b border-zinc-800 pb-6">
          <h2 className="text-base font-semibold text-white">Snapshot do Catálogo (TMDb)</h2>
          <p className="text-xs text-zinc-400">
            Estes dados ficam congelados no evento após a criação.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {formData.imageUrl && (
              <div className="relative aspect-[2/3] w-full rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700">
                <Image
                  src={formData.imageUrl}
                  alt={formData.title || 'Poster'}
                  fill
                  className="object-cover"
                  unoptimized={!formData.imageUrl.startsWith('https://image.tmdb.org')}
                />
              </div>
            )}

            <div className={`space-y-4 ${formData.imageUrl ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  ID Externo TMDb *
                </label>
                <input
                  type="text"
                  name="externalCatalogId"
                  required
                  value={formData.externalCatalogId}
                  onChange={handleChange}
                  placeholder="Ex: 157336"
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Título do Evento / Filme *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Interstellar — Sessão de Gala"
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  URL da Imagem / Pôster
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://image.tmdb.org/..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Descrição / Sinopse
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Breve descrição do evento..."
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Dados Operacionais</h2>
          <p className="text-xs text-zinc-400">
            Defina a data, local, capacidade total de assentos e valor do ingresso.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Data e Hora de Início *
              </label>
              <input
                type="datetime-local"
                name="startsAt"
                required
                value={formData.startsAt}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Local / Sala *
              </label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                placeholder="Ex: Cine Elite - Sala IMAX"
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Capacidade (Ingressos) *
              </label>
              <input
                type="number"
                name="capacity"
                min="1"
                required
                value={formData.capacity}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
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
                required
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Link
            href="/organizer/events"
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Salvando...' : 'Criar Evento (Rascunho)'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <AuthGuard allowedRoles={['ORGANIZER']}>
      <Suspense
        fallback={
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        }
      >
        <NewEventForm />
      </Suspense>
    </AuthGuard>
  );
}
