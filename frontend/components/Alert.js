'use client';

export default function Alert({ type = 'error', message, details = [], className = '' }) {
  if (!message && (!details || details.length === 0)) return null;

  const styles = {
    error: 'bg-rose-950/40 text-rose-200 border-rose-800/60',
    warning: 'bg-amber-950/40 text-amber-200 border-amber-800/60',
    success: 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60',
    info: 'bg-blue-950/40 text-blue-200 border-blue-800/60',
  };

  return (
    <div className={`p-4 rounded-xl border text-sm backdrop-blur-sm shadow-sm ${styles[type] || styles.error} ${className}`}>
      {message && <div className="font-medium">{message}</div>}
      {details && details.length > 0 && (
        <ul className="mt-2 list-disc list-inside text-xs space-y-1 opacity-90">
          {details.map((detail, idx) => (
            <li key={idx}>
              {detail.field ? <span className="font-semibold">{detail.field}: </span> : null}
              {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
