import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerService } from '../services/api';
import { formatPhoneBR, isValidPhoneBR, normalizePhoneToDigits } from '../utils/phone';
import type { RegisterClientData } from '../types';

const RegisterClient: React.FC = () => {
  const [formData, setFormData] = useState<RegisterClientData>({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Format phone visually while storing raw string in state
    if (name === 'telefone') {
      setFormData((prev: RegisterClientData) => ({ ...prev, telefone: formatPhoneBR(value) }));
    } else {
      setFormData((prev: RegisterClientData) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.senha !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    // Phone validation (BR): require 10 or 11 digits
    if (!isValidPhoneBR(formData.telefone)) {
      setError('Informe um telefone válido com DDD (10 ou 11 dígitos).');
      setIsLoading(false);
      return;
    }

    try {
  // normalize telefone to digits-only for the API
  const payload = { ...formData, telefone: normalizePhoneToDigits(formData.telefone) } as RegisterClientData;
  const response = await registerService.registerClient(payload);
      setSuccess(response.message || 'Cliente cadastrado com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar cliente. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-md w-full space-y-8 login-right bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 border border-gray-700 rounded-2xl p-8">
        <div className="text-center">
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
            Cadastro de Cliente
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Crie sua conta para agendar serviços
          </p>
        </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="nome"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Nome completo
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={handleChange}
                />
              </div>

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
                  htmlFor="telefone"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Telefone
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
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
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-200 mb-2"
                >
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {success && (
              <div className="rounded-lg bg-green-900 border border-green-800 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-green-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-3 text-sm text-green-200">{success}</p>
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
                    className="animate-spin h-5 w-5 text-black"
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
                  'Cadastrar Cliente'
                )}
              </button>
            </div>

            <div className="text-center border-t border-gray-700 pt-6 space-y-2">
              <p className="text-sm text-gray-400">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#ffb400] hover:text-[#ff8c00]"
                >
                  Faça login aqui
                </Link>
              </p>
              <p className="text-sm text-gray-400">
                Quer cadastrar uma barbearia?{' '}
                <Link
                  to="/register/barbershop"
                  className="font-semibold text-[#ffb400] hover:text-[#ff8c00]"
                >
                  Clique aqui
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
  );
};

export default RegisterClient;