import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { RegisterBarbershopData } from '../types';
import { formatPhoneBR, isValidPhoneBR, normalizePhoneToDigits } from '../utils/phone';

const RegisterBarbershop: React.FC = () => {
  const [formData, setFormData] = useState<RegisterBarbershopData>({
    barbearia_nome: '',
    endereco: '',
    telefone_contato: '',
    horario_funcionamento: '',
    proprietario_nome: '',
    proprietario_email: '',
    proprietario_telefone: '',
    proprietario_senha: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const goBack = () => {
    try {
      const canGoBack = typeof window !== 'undefined' && window.history && window.history.length > 1;
      if (canGoBack) navigate(-1);
      else navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (name === 'telefone_contato' || name === 'proprietario_telefone') {
      setFormData((prev: RegisterBarbershopData) => ({ ...prev, [name]: formatPhoneBR(value) } as any));
    } else {
      setFormData((prev: RegisterBarbershopData) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.proprietario_senha !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (formData.proprietario_senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (!isValidPhoneBR(formData.telefone_contato)) {
      setError('Informe um telefone de contato válido com DDD (10 ou 11 dígitos).');
      setIsLoading(false);
      return;
    }
    if (!isValidPhoneBR(formData.proprietario_telefone)) {
      setError('Informe um telefone pessoal válido do proprietário com DDD (10 ou 11 dígitos).');
      setIsLoading(false);
      return;
    }

    try {
      const payload: RegisterBarbershopData = {
        ...formData,
        telefone_contato: normalizePhoneToDigits(formData.telefone_contato) ?? '',
        proprietario_telefone: normalizePhoneToDigits(formData.proprietario_telefone) ?? '',
      } as RegisterBarbershopData;

      const response = await registerService.registerBarbershop(payload);
      login(response.token, response.proprietario);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar barbearia. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8">
      <div className="max-w-4xl w-full space-y-8 login-right bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 border border-gray-700 rounded-2xl p-8">
        {/* Logo */}
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
            Cadastre sua Barbearia
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Complete as informações abaixo para criar sua conta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-gray-700 pb-6">
            <h3 className="text-lg font-medium text-white mb-4">
              Informações da Barbearia
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label htmlFor="barbearia_nome" className="block text-sm font-medium text-gray-200 mb-2">
                  Nome da Barbearia
                </label>
                <input
                  id="barbearia_nome"
                  name="barbearia_nome"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Ex: Barbearia do João"
                  value={formData.barbearia_nome}
                  onChange={handleChange}
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="endereco" className="block text-sm font-medium text-gray-200 mb-2">
                  Endereço
                </label>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Rua, número, bairro, cidade"
                  value={formData.endereco}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="telefone_contato" className="block text-sm font-medium text-gray-200 mb-2">
                  Telefone de Contato
                </label>
                <input
                  id="telefone_contato"
                  name="telefone_contato"
                  type="tel"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone_contato}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="horario_funcionamento" className="block text-sm font-medium text-gray-200 mb-2">
                  Horário de Funcionamento
                </label>
                <textarea
                  id="horario_funcionamento"
                  name="horario_funcionamento"
                  rows={3}
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150 resize-none"
                  placeholder="Ex: Segunda à Sexta: 8h às 18h, Sábado: 8h às 16h"
                  value={formData.horario_funcionamento}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Informações do Proprietário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="proprietario_nome" className="block text-sm font-medium text-gray-200 mb-2">
                  Nome do Proprietário
                </label>
                <input
                  id="proprietario_nome"
                  name="proprietario_nome"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Seu nome completo"
                  value={formData.proprietario_nome}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="proprietario_telefone" className="block text-sm font-medium text-gray-200 mb-2">
                  Telefone Pessoal
                </label>
                <input
                  id="proprietario_telefone"
                  name="proprietario_telefone"
                  type="tel"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="(11) 88888-8888"
                  value={formData.proprietario_telefone}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="proprietario_email" className="block text-sm font-medium text-gray-200 mb-2">
                  E-mail
                </label>
                <input
                  id="proprietario_email"
                  name="proprietario_email"
                  type="email"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="seu@email.com"
                  value={formData.proprietario_email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="proprietario_senha" className="block text-sm font-medium text-gray-200 mb-2">
                  Senha
                </label>
                <input
                  id="proprietario_senha"
                  name="proprietario_senha"
                  type="password"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-[#0f1720] border border-[#23272b] rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-0 transition duration-150"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.proprietario_senha}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                  Confirmar Senha
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
                'Cadastrar Barbearia'
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
              É cliente?{' '}
              <Link
                to="/register/client"
                className="font-semibold text-[#ffb400] hover:text-[#ff8c00]"
              >
                Cadastre-se como cliente
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterBarbershop;