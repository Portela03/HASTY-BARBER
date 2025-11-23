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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex relative overflow-hidden">
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Lado esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 backdrop-blur-sm" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white w-full">
          <div className="mb-12 animate-fadeIn">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 rounded-2xl blur-xl opacity-50" />
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Hasty Barber
                </h1>
                <p className="text-gray-400 mt-1 font-medium">Seu estilo, seu horário</p>
              </div>
            </div>
            <p className="text-xl text-gray-300 leading-relaxed">
              A melhor experiência em agendamentos. Encontre sua barbearia favorita e agende seu horário em segundos.
            </p>
          </div>

          <div className="space-y-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className="group flex items-start gap-4 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:from-amber-400/30 group-hover:to-yellow-500/30 transition-all">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-white mb-1">Agende com Praticidade</p>
                <p className="text-sm text-gray-400">Reserve seu horário em poucos cliques, escolha seu barbeiro favorito e receba lembretes</p>
              </div>
            </div>

            <div className="group flex items-start gap-4 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:from-amber-400/30 group-hover:to-yellow-500/30 transition-all">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-white mb-1">Horários Disponíveis</p>
                <p className="text-sm text-gray-400">Veja os horários em tempo real e nunca mais perca tempo esperando na fila</p>
              </div>
            </div>

            <div className="group flex items-start gap-4 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:from-amber-400/30 group-hover:to-yellow-500/30 transition-all">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-white mb-1">Experiência Premium</p>
                <p className="text-sm text-gray-400">Histórico de cortes, avaliações e acesso às melhores barbearias da região</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="max-w-md w-full">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8 animate-fadeIn">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 rounded-xl blur-lg opacity-50" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">
                Hasty Barber
              </h1>
            </div>
          </div>

          <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <div>
              <div className="text-center mb-8">
                <h2 className="text-4xl font-black mb-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                    Bem-vindo
                  </span>
                </h2>
                <p className="text-gray-400">Entre com suas credenciais para continuar</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                      E-mail
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="senha" className="block text-sm font-semibold text-gray-300 mb-2">
                      Senha
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="senha"
                        name="senha"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        value={formData.senha}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 animate-shake">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-sm text-red-300 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <a 
                    href="/forgot-password" 
                    className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`relative flex-1 py-3.5 rounded-xl font-bold text-gray-900 overflow-hidden shadow-lg shadow-amber-500/20 ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]'
                    } transition-all duration-200`}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
                      backgroundSize: '200% 100%',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-900/50 text-gray-500">ou</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Não tem uma conta?{' '}
                    <a 
                      href="/register/client" 
                      className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all"
                    >
                      Cadastre-se agora
                    </a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;