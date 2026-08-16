'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AuthGuard from '../../components/AuthGuard';
import CameraQrScanner from '../../components/CameraQrScanner';
import Alert from '../../components/Alert';
import { api, ApiClientError } from '../../lib/api';
import { formatDate } from '../../lib/formatters';

export default function GateValidationPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'camera'
  const [manualCode, setManualCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [lastValidation, setLastValidation] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);

  const manualInputRef = useRef(null);

  // Load published events
  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await api.get('/events?limit=50');
        if (isMounted && response.items) {
          setEvents(response.items);
          if (response.items.length > 0) {
            setSelectedEventId(response.items[0].id);
          }
        }
      } catch {
        if (isMounted) {
          setValidationError('Erro ao carregar lista de eventos.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleValidateCode = useCallback(
    async (codeToValidate) => {
      const trimmed = (codeToValidate || '').trim();
      if (!trimmed) {
        setValidationError('Por favor, informe o código do ingresso.');
        return;
      }

      if (!selectedEventId) {
        setValidationError('Por favor, selecione o evento na portaria.');
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const result = await api.validateGateTicket(selectedEventId, trimmed);
        const record = {
          id: Date.now(),
          timestamp: new Date(),
          code: trimmed,
          result: result.result,
          ticket: result.ticket,
          event: result.event,
        };

        setLastValidation(record);
        setValidationHistory((prev) => [record, ...prev.slice(0, 9)]);
        setManualCode('');
      } catch (err) {
        if (err instanceof ApiClientError) {
          setValidationError(err.message || 'Erro ao validar ingresso.');
        } else {
          setValidationError('Erro de conexão com o servidor.');
        }
      } finally {
        setIsValidating(false);
      }
    },
    [selectedEventId],
  );

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleValidateCode(manualCode);
  };

  const handleNextScan = () => {
    setLastValidation(null);
    setValidationError(null);
    setManualCode('');
    if (inputMode === 'manual') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 50);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <AuthGuard allowedRoles={['GATE']}>
      <div className="mx-auto max-w-xl space-y-6 py-4 px-4">
        {/* Header Portaria */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-md">
              Portaria
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Validação de Ingressos
            </h1>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-800 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Operação Online
            </span>
          </div>
        </div>

        {/* Event Selector */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 space-y-2 backdrop-blur-xl">
          <label
            htmlFor="event-select"
            className="block text-xs font-bold uppercase tracking-wider text-zinc-400"
          >
            Evento em Validação na Portaria:
          </label>

          {isLoadingEvents ? (
            <p className="text-xs text-zinc-500">Carregando eventos...</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-amber-400">Nenhum evento publicado encontrado.</p>
          ) : (
            <select
              id="event-select"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setLastValidation(null);
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none transition-colors"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} — {formatDate(evt.startsAt)} ({evt.location})
                </option>
              ))}
            </select>
          )}

          {selectedEvent && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
              <span>📍 {selectedEvent.location}</span>
              <span>🎟️ Capacidade: {selectedEvent.capacity}</span>
            </div>
          )}
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setInputMode('manual');
              setLastValidation(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
              inputMode === 'manual'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⌨️ Digitação / Código
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('camera');
              setLastValidation(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
              inputMode === 'camera'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            📷 Câmera (QR Code)
          </button>
        </div>

        {validationError && (
          <Alert type="error" message={validationError} onClose={() => setValidationError(null)} />
        )}

        {/* Interactive Validation Area */}
        {!lastValidation ? (
          <div className="space-y-4">
            {inputMode === 'camera' ? (
              <div className="space-y-3">
                <CameraQrScanner
                  onScan={(code) => handleValidateCode(code)}
                  onError={(err) => setValidationError(err)}
                  isScanning={!isValidating && !lastValidation}
                />
                <p className="text-center text-[11px] text-zinc-400">
                  Aponte a câmera para o QR Code do ingresso do participante.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleManualSubmit}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4 shadow-xl"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="code-input"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                  >
                    Código do Ingresso (Secure Code / Leitor de Código):
                  </label>
                  <input
                    ref={manualInputRef}
                    id="code-input"
                    type="text"
                    autoFocus
                    placeholder="Digite ou leia o código do ticket..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    disabled={isValidating}
                    className="w-full rounded-2xl border-2 border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base font-mono text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isValidating || !manualCode.trim()}
                  className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99]"
                >
                  {isValidating ? 'Validando ingresso...' : 'Validar Ingresso (Enter)'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Big Bold Validation Result Card */
          <div className="space-y-4 animate-in fade-in zoom-in duration-200">
            {lastValidation.result === 'VALID' && (
              <div className="overflow-hidden rounded-3xl border-2 border-emerald-500 bg-emerald-950/40 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-black text-3xl font-black">
                  ✓
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block">
                    Acesso Permitido
                  </span>
                  <h2 className="text-2xl font-black text-emerald-100">
                    INGRESSO VÁLIDO
                  </h2>
                  <p className="text-sm font-medium text-emerald-300">
                    {lastValidation.event?.title || selectedEvent?.title}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-950/80 border border-emerald-800/80 p-3 text-xs text-emerald-200 space-y-1">
                  <div>Ticket ID: <span className="font-mono">{lastValidation.ticket?.id}</span></div>
                  <div>Validado às: {formatDate(lastValidation.ticket?.validatedAt || lastValidation.timestamp)}</div>
                </div>
              </div>
            )}

            {lastValidation.result === 'INVALID' && (
              <div className="overflow-hidden rounded-3xl border-2 border-rose-500 bg-rose-950/40 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.25)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white text-3xl font-black">
                  ✕
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-rose-400 block">
                    Acesso Negado
                  </span>
                  <h2 className="text-2xl font-black text-rose-100">
                    INGRESSO INVÁLIDO
                  </h2>
                  <p className="text-sm font-medium text-rose-300">
                    Código não encontrado no sistema.
                  </p>
                </div>

                <div className="rounded-2xl bg-rose-950/80 border border-rose-800/80 p-3 text-xs text-rose-200">
                  Código verificado: <span className="font-mono">{lastValidation.code}</span>
                </div>
              </div>
            )}

            {lastValidation.result === 'ALREADY_USED' && (
              <div className="overflow-hidden rounded-3xl border-2 border-amber-500 bg-amber-950/40 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black text-3xl font-black">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400 block">
                    Atenção — Uso Duplicado
                  </span>
                  <h2 className="text-2xl font-black text-amber-100">
                    JÁ UTILIZADO
                  </h2>
                  <p className="text-sm font-medium text-amber-300">
                    Este ingresso já foi validado anteriormente na portaria.
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-950/80 border border-amber-800/80 p-3 text-xs text-amber-200 space-y-1">
                  <div>Ticket ID: <span className="font-mono">{lastValidation.ticket?.id}</span></div>
                  {lastValidation.ticket?.validatedAt && (
                    <div>Primeiro uso em: {formatDate(lastValidation.ticket?.validatedAt)}</div>
                  )}
                </div>
              </div>
            )}

            {lastValidation.result === 'WRONG_EVENT' && (
              <div className="overflow-hidden rounded-3xl border-2 border-purple-500 bg-purple-950/40 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-500 text-white text-3xl font-black">
                  🔄
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-purple-400 block">
                    Evento Incorreto
                  </span>
                  <h2 className="text-2xl font-black text-purple-100">
                    OUTRO EVENTO
                  </h2>
                  <p className="text-sm font-medium text-purple-300">
                    O ingresso é autêntico, mas pertence a outro evento.
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-950/80 border border-purple-800/80 p-3 text-xs text-purple-200">
                  <div>Ticket ID: <span className="font-mono">{lastValidation.ticket?.id}</span></div>
                  <div>Evento Selecionado na Portaria: <span className="font-semibold">{selectedEvent?.title}</span></div>
                </div>
              </div>
            )}

            {/* Action button: Next attendee */}
            <button
              type="button"
              onClick={handleNextScan}
              className="w-full rounded-2xl bg-zinc-100 py-4 text-base font-black text-zinc-950 hover:bg-white shadow-xl transition-all active:scale-[0.99]"
            >
              ➔ Validar Próximo Ingresso
            </button>
          </div>
        )}

        {/* Recent Validations Log */}
        {validationHistory.length > 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Histórico Recente da Sessão ({validationHistory.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validationHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.result === 'VALID'
                          ? 'bg-emerald-400'
                          : item.result === 'ALREADY_USED'
                            ? 'bg-amber-400'
                            : item.result === 'WRONG_EVENT'
                              ? 'bg-purple-400'
                              : 'bg-rose-400'
                      }`}
                    />
                    <span className="font-mono text-zinc-300 truncate max-w-[120px] sm:max-w-[200px]">
                      {item.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.result === 'VALID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : item.result === 'ALREADY_USED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : item.result === 'WRONG_EVENT'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {item.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
