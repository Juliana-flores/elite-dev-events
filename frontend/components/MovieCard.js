'use client';

import Image from 'next/image';

export default function MovieCard({ movie, onSelect }) {
  const { externalId, title, description, imageUrl, releaseDate } = movie;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700 hover:shadow-xl">
      <div className="relative aspect-[2/3] w-full bg-zinc-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || 'Filme'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
            unoptimized={!imageUrl.startsWith('https://image.tmdb.org')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-zinc-500">
            Sem pôster disponível
          </div>
        )}
        <div className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
          TMDb #{externalId}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-white text-base line-clamp-1" title={title}>
              {title}
            </h3>
          </div>
          {releaseDate && (
            <p className="mt-0.5 text-xs text-zinc-400">
              Lançamento: {releaseDate.substring(0, 4)}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
            {description || 'Sem sinopse disponível.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelect(movie)}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
        >
          Criar Evento com este Filme
        </button>
      </div>
    </div>
  );
}
