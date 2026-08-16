'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Alert from '../../../components/Alert';
import AuthGuard from '../../../components/AuthGuard';
import { api, ApiClientError } from '../../../lib/api';
import { formatPrice } from '../../../lib/formatters';

export default function CheckoutPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const reservationId = params.id;

  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadReservation = async () => {
      setIsLoading(true);
      setPageError(null);

      try {
        const data = await api.getReservation(reservationId);
        if (isMounted) {
          setReservation(data);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError) {
            if (err.statusCode === 404) {
              setPageError('Reserva não encontrada.');
            } else if (err.statusCode === 403) {
              setPageError('Você não tem permissão para acessar esta reserva.');
            } else {
              setPageError(err.message || 'Erro ao carregar a reserva.');
            }
          } else {
            setPageError('Falha de conexão ao buscar os detalhes da reserva.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (reservationId) {
      loadReservation();
    }

    return () => {
      isMounted = false;
    };
  }, [reservationId]);

  const handleSimulatePayment = async (simulation) => {
    setIsProcessing(true);
    setPageError(null);
    setPaymentResult(null);

    try {
      const response = await api.processPayment(reservationId, simulation);
      setPaymentResult(response);
      setReservation(response.reservation);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EVENT_SOLD_OUT') {
          setPageError('Desculpe, os ingressos deste evento se esgotaram durante o processo.');
        } else if (err.code === 'RESERVATION_ALREADY_PAID') {
          setPageError('Esta reserva já foi paga anteriormente.');
          try {
            const updated = await api.getReservation(reservationId);
            setReservation(updated);
          } catch {
            // ignore
          }
        } else if (err.code === 'RESERVATION_NOT_PAYABLE') {
          setPageError('Esta reserva não está mais disponível para pagamento.');
          try {
            const updated = await api.getReservation(reservationId);
            setReservation(updated);
          } catch {
            // ignore
          }
        } else {
          setPageError(err.message || 'Erro ao processar o pagamento simulado.');
        }
      } else {
        setPageError('Falha inesperada ao processar o pagamento.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['CUSTOMER']}>
      <div className="mx-auto max-w-2xl space-y-8 py-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Checkout do Pedido
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Revise os dados da sua reserva e execute o pagamento simulado
          </p>
        </div>

        {pageError && <Alert type="error" message={pageError} />}

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Carregando reserva...</p>
            </div>
          </div>
        ) : reservation ? (
          <div className="space-y-6">
            {/* Payment Result Notification */}
            {paymentResult && (
              <div>
                {paymentResult.payment.status === 'APPROVED' ? (
                  <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/40 p-6 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xl font-bold">
                        ✓
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-emerald-300">
                          Pagamento Aprovado com Sucesso!
                        </h3>
                        <p className="text-xs text-emerald-400/80">
                          {paymentResult.tickets.length}{' '}
                          {paymentResult.tickets.length === 1
                            ? 'ingresso emitido'
                            : 'ingressos emitidos'}{' '}
                          e disponíveis na sua conta.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Link
                        href="/me/tickets"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-colors"
                      >
                        🎟️ Acessar Meus Ingressos
                      </Link>
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-xl border border-emerald-700/60 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/30 transition-colors"
                      >
                        Ver Outros Eventos
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Alert
                    type="error"
                    message="O pagamento foi recusado pelo simulador. A reserva foi marcada como pagamento falho. Você pode tentar novamente com uma nova reserva."
                  />
                )}
              </div>
            )}

            {/* Order Summary Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl space-y-6 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Identificador da Reserva
                  </span>
                  <p className="font-mono text-xs font-bold text-zinc-300">
                    {reservation.id}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                      reservation.status === 'PAID'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : reservation.status === 'PAYMENT_FAILED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {reservation.status === 'PAID'
                      ? 'PAGO / CONFIRMADO'
                      : reservation.status === 'PAYMENT_FAILED'
                        ? 'PAGAMENTO RECUSADO'
                        : 'AGUARDANDO PAGAMENTO'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Quantidade de Ingressos:</span>
                  <span className="font-bold text-white">
                    {reservation.quantity}{' '}
                    {reservation.quantity === 1 ? 'ingresso' : 'ingressos'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Valor Unitário:</span>
                  <span className="font-medium text-zinc-300">
                    {formatPrice(reservation.unitPrice)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-zinc-800 pt-3 text-base">
                  <span className="font-bold text-white">Total a Pagar:</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {formatPrice(reservation.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulation Actions */}
            {reservation.status === 'PENDING_PAYMENT' && (
              <div className="rounded-2xl border border-indigo-900/40 bg-zinc-900/60 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Simulação de Gateway de Pagamento
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Escolha o cenário de teste para processar esta reserva:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSimulatePayment('APPROVE')}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>💳</span>
                        <span>Simular APROVAÇÃO</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulatePayment('DECLINE')}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-700/80 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-700/20 hover:bg-rose-600 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>❌</span>
                        <span>Simular RECUSA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {reservation.status === 'PAID' && !paymentResult && (
              <div className="text-center pt-4">
                <Link
                  href="/me/tickets"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
                >
                  🎟️ Visualizar Meus Ingressos
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
