export function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatPrice(price) {
  if (price === undefined || price === null || price === '') return 'Grátis';
  const num = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(num) || num === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatEventStatus(status) {
  const map = {
    DRAFT: { label: 'Rascunho', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
    PUBLISHED: { label: 'Publicado', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    CANCELLED: { label: 'Cancelado', color: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
    COMPLETED: { label: 'Concluído', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  };
  return map[status] || { label: status || 'Desconhecido', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' };
}
