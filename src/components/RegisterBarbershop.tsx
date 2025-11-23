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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10 text-center">
            <div className="text-left w-full mb-4">
              <button onClick={goBack} className="mb-4 flex items-center gap-2 text-amber-400 group">
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar</span>
              </button>
            </div>
            <h1 className="text-4xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-3">Cadastre sua Barbearia</h1>
            <p className="text-gray-300 text-sm">Complete as informações abaixo para criar sua conta</p>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-gray-700 pb-6">
                <h3 className="text-lg font-medium text-gray-200 mb-4">Informações da Barbearia</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="lg:col-span-2">
                    <label htmlFor="barbearia_nome" className="block text-sm font-medium text-gray-300">Nome da Barbearia *</label>
                    <input
                      id="barbearia_nome"
                      name="barbearia_nome"
                      type="text"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Ex: Barbearia do João"
                      value={formData.barbearia_nome}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label htmlFor="endereco" className="block text-sm font-medium text-gray-300">Endereço *</label>
                    <input
                      id="endereco"
                      name="endereco"
                      type="text"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Rua, número, bairro, cidade"
                      value={formData.endereco}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="telefone_contato" className="block text-sm font-medium text-gray-300">Telefone de Contato *</label>
                    <input
                      id="telefone_contato"
                      name="telefone_contato"
                      type="tel"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone_contato}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="horario_funcionamento" className="block text-sm font-medium text-gray-300">Horário de Funcionamento *</label>
                    <textarea
                      id="horario_funcionamento"
                      name="horario_funcionamento"
                      rows={3}
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Ex: Segunda à Sexta: 8h às 18h, Sábado: 8h às 16h"
                      value={formData.horario_funcionamento}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-200 mb-4">Informações do Proprietário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="proprietario_nome" className="block text-sm font-medium text-gray-300">Nome do Proprietário *</label>
                    <input
                      id="proprietario_nome"
                      name="proprietario_nome"
                      type="text"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Seu nome completo"
                      value={formData.proprietario_nome}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="proprietario_telefone" className="block text-sm font-medium text-gray-300">Telefone Pessoal *</label>
                    <input
                      id="proprietario_telefone"
                      name="proprietario_telefone"
                      type="tel"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="(11) 88888-8888"
                      value={formData.proprietario_telefone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="proprietario_email" className="block text-sm font-medium text-gray-300">Email *</label>
                    <input
                      id="proprietario_email"
                      name="proprietario_email"
                      type="email"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="seu@email.com"
                      value={formData.proprietario_email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="proprietario_senha" className="block text-sm font-medium text-gray-300">Senha *</label>
                    <input
                      id="proprietario_senha"
                      name="proprietario_senha"
                      type="password"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.proprietario_senha}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">Confirmar Senha *</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="mt-1 block w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-amber-400 focus:border-amber-400 sm:text-sm"
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-red-800 text-sm text-center">{error}</div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="relative flex-1 bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 rounded-lg font-semibold transform transition-transform duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
                >
                  <span className="relative z-10">Cancelar</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`relative flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-gray-900 py-3 rounded-lg font-semibold transform transition-transform duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'overflow-hidden group hover:-translate-y-1'}`}
                >
                  <span className="relative z-10">{isLoading ? 'Cadastrando...' : 'Cadastrar Barbearia'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </div>

              <div className="text-center space-y-2 mt-3">
                <p className="text-sm text-gray-400">Já tem uma conta?{' '}
                  <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300">Faça login aqui</Link>
                </p>
                <div className="pt-2">
                  <Link 
                    to="/register/client"
                    className="group relative flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-gray-800/80 to-gray-800/60 hover:from-gray-800 hover:to-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white text-sm">Sou Cliente</p>
                        <p className="text-xs text-gray-400">Agende seu horário</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterBarbershop;