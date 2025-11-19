import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api'; // ✅ usa o mesmo service que funcionava
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
    <div className="min-h-screen flex login-screen">
      {/* Lado esquerdo - imagem e texto */}
      <div className="hidden lg:flex lg:w-1/2 relative login-left">
        <div
          className="absolute inset-0 bg-cover bg-center login-left-image"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')",
            filter: 'brightness(1)'
            }}
        />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white login-left-content">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#ffb400] rounded-full mb-6">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold mb-4">Hasty Barber</h1>
            <p className="text-xl text-gray-200">
              Gerencie seus agendamentos com praticidade e eficiência.
            </p>
          </div>
 
          <div className="space-y-4 mt-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Agendamentos Inteligentes</p>
                <p className="text-sm text-gray-400">
                  Sistema automatizado de reservas
                </p>
              </div>
            </div>
 
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Controle Total</p>
                <p className="text-sm text-gray-400">
                  Gerencie horários e barbeiros
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Lado direito - formulário */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-md w-full space-y-8 login-right bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 border border-gray-700 rounded-2xl p-8 ">
          {/* Logo em telas pequenas */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ffb400] rounded-full mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Hasty Barber</h2>
          </div>
 
          <div>
            <h2 className="text-center text-2xl font-extrabold text-white">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-center text-sm text-gray-300">
              Faça login para continuar
            </p>
          </div>
 
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
 
              <div>
                <label
                  htmlFor="senha"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Senha
                </label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-4 py-3 bg[#0f1720] bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="••••••••"
                  value={formData.senha}
                  onChange={handleChange}
                />
              </div>
            </div>
 
            {error && (
              <div className="rounded-lg bg-red-900 border border-red-800 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-3 text-sm text-red-200">{error}</p>
                </div>
              </div>
            )}
 
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-black bg-[#f6b21b] hover:bg-[#f5a71a] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 font-semibold shadow-lg"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
 
            <div className="flex items-center justify-between text-sm">
              <a
                href="#"
                className="font-medium text-[#ffb400] hover:text-[#ff8c00]"
              >
                Esqueceu a senha?
              </a>
            </div>
 
            <div className="text-center border-t border-gray-700 pt-6">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <a
                  href="/register/client"
                  className="font-semibold text-[#ffb400] hover:text-[#ff8c00]"
                >
                  Cadastre-se agora
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
 
export default Login;