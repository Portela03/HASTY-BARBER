import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import type { LoginData } from '../types';

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    senha: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      login(response.token, response.usuario);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erro ao fazer login. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="mx-auto flex items-center justify-center w-20 h-20 bg-amber-400 rounded-full mb-6">
              <svg className="w-10 h-10 text-white block" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 10a3 3 0 100-6 3 3 0 000 6zm-7 7a7 7 0 0114 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold mb-2">Hasty Barber</h1>
            <p className="text-lg text-gray-300">Gerencie seus agendamentos com praticidade.</p>
          </div>

          <div className="space-y-4 mt-6 text-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Agendamentos Inteligentes</p>
                <p className="text-sm text-gray-300">Sistema automatizado de reservas</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Controle Total</p>
                <p className="text-sm text-gray-300">Gerencie horários e barbeiros</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16">
        <div className="max-w-md w-full">
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">

            <div style={{ animation: 'fadeInUp 420ms ease both' }}>
              <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">Bem-vindo de volta</h2>
                <p className="mt-2 text-sm text-gray-300">Faça login para continuar</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm text-gray-300 mb-2">E-mail</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="senha" className="block text-sm text-gray-300 mb-2">Senha</label>
                    <input
                      id="senha"
                      name="senha"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="••••••••"
                      value={formData.senha}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-semibold border border-gray-600 hover:opacity-90"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`relative flex-1 py-3 rounded-lg font-semibold text-gray-900 overflow-hidden ${isLoading ? 'opacity-70 cursor-not-allowed' : 'group'}`}
                    style={{
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  >
                    <span className="relative z-10">{isLoading ? 'Entrando...' : 'Entrar'}</span>
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </button>
                </div>

                <div className="text-center border-t border-gray-700 pt-4 text-sm text-gray-300">
                  <div className="mt-3">Não tem uma conta? <a href="/register/client" className="font-medium text-amber-300 hover:underline">Cadastre-se</a></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default Login;