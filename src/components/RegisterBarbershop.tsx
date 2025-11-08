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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // format phone fields visually
    if (name === 'telefone_contato' || name === 'proprietario_telefone') {
      setFormData((prev: RegisterBarbershopData) => ({ ...prev, [name]: formatPhoneBR(value) } as any));
    } else {
      setFormData((prev: RegisterBarbershopData) => ({
        ...prev,
        [name]: value,
      }));
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

    // Validate phone fields
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
      // normalize phones to digits-only
      const payload: RegisterBarbershopData = {
        ...formData,
        telefone_contato: normalizePhoneToDigits(formData.telefone_contato) ?? '',
        proprietario_telefone: normalizePhoneToDigits(formData.proprietario_telefone) ?? '',
      };
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
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Cadastre sua Barbearia
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete as informações abaixo para criar sua conta
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Informações da Barbearia
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-2">
                  <label htmlFor="barbearia_nome" className="block text-sm font-medium text-gray-700">
                    Nome da Barbearia *
                  </label>
                  <input
                    id="barbearia_nome"
                    name="barbearia_nome"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ex: Barbearia do João"
                    value={formData.barbearia_nome}
                    onChange={handleChange}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                    Endereço *
                  </label>
                  <input
                    id="endereco"
                    name="endereco"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Rua, número, bairro, cidade"
                    value={formData.endereco}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="telefone_contato" className="block text-sm font-medium text-gray-700">
                    Telefone de Contato *
                  </label>
                  <input
                    id="telefone_contato"
                    name="telefone_contato"
                    type="tel"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="(11) 99999-9999"
                    value={formData.telefone_contato}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="horario_funcionamento" className="block text-sm font-medium text-gray-700">
                    Horário de Funcionamento *
                  </label>
                  <textarea
                    id="horario_funcionamento"
                    name="horario_funcionamento"
                    rows={3}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ex: Segunda à Sexta: 8h às 18h, Sábado: 8h às 16h"
                    value={formData.horario_funcionamento}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Informações do Proprietário
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proprietario_nome" className="block text-sm font-medium text-gray-700">
                    Nome do Proprietário *
                  </label>
                  <input
                    id="proprietario_nome"
                    name="proprietario_nome"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Seu nome completo"
                    value={formData.proprietario_nome}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="proprietario_telefone" className="block text-sm font-medium text-gray-700">
                    Telefone Pessoal *
                  </label>
                  <input
                    id="proprietario_telefone"
                    name="proprietario_telefone"
                    type="tel"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="(11) 88888-8888"
                    value={formData.proprietario_telefone}
                    onChange={handleChange}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="proprietario_email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    id="proprietario_email"
                    name="proprietario_email"
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="seu@email.com"
                    value={formData.proprietario_email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="proprietario_senha" className="block text-sm font-medium text-gray-700">
                    Senha *
                  </label>
                  <input
                    id="proprietario_senha"
                    name="proprietario_senha"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.proprietario_senha}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmar Senha *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-red-800 text-sm text-center">
                  {error}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Barbearia'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Faça login aqui
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                É cliente?{' '}
                <Link
                  to="/register/client"
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  Cadastre-se como cliente
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterBarbershop;