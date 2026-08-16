'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../lib/api';
import Alert from '../../components/Alert';

const SEED_USERS = [
  { label: 'Organizador', email: 'organizer@elite.dev', role: 'ORGANIZER' },
  { label: 'Cliente 1', email: 'customer1@elite.dev', role: 'CUSTOMER' },
  { label: 'Cliente 2', email: 'customer2@elite.dev', role: 'CUSTOMER' },
  { label: 'Portaria (Gate)', email: 'gate@elite.dev', role: 'GATE' },
];

export default function LoginPage() {
  const { login, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState({ message: '', details: [] });

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      if (user.role === 'ORGANIZER') {
        router.push('/organizer/events');
      } else {
        router.push('/');
      }
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorState({ message: 'Por favor, preencha o email e a senha.', details: [] });
      return;
    }

    setIsSubmitting(true);
    setErrorState({ message: '', details: [] });

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'ORGANIZER') {
        router.push('/organizer/events');
      } else {
        router.push('/');
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrorState({
            message: 'Email ou senha inválidos. Por favor, tente novamente.',
            details: [],
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          setErrorState({
            message: 'Erro de validação dos dados de entrada.',
            details: err.details,
          });
        } else {
          setErrorState({
            message: err.message || 'Ocorreu um erro ao tentar autenticar.',
            details: err.details,
          });
        }
      } else {
        setErrorState({
          message: 'Falha inesperada ao tentar autenticar.',
          details: [],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (userEmail) => {
    setEmail(userEmail);
    setPassword('password');
    setErrorState({ message: '', details: [] });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-black text-xl text-white shadow-lg shadow-indigo-600/30">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Acessar Plataforma</h1>
          <p className="mt-1 text-sm text-zinc-400">Entre com suas credenciais para continuar</p>
        </div>

        {errorState.message && (
          <div className="mb-6">
            <Alert type="error" message={errorState.message} details={errorState.details} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <p className="text-center text-xs font-medium text-zinc-400">
            Contas de teste (Seed / MVP):
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SEED_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => handleQuickFill(u.email)}
                className="flex flex-col items-start rounded-lg border border-zinc-800 bg-zinc-800/50 p-2.5 text-left text-xs transition-colors hover:border-indigo-500/50 hover:bg-zinc-800"
              >
                <span className="font-semibold text-zinc-200">{u.label}</span>
                <span className="text-[10px] text-zinc-400 truncate w-full">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
