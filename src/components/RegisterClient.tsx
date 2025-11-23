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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-amber-400 group">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar</span>
            </button>
            <h1 className="text-4xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-3">Cadastro de Cliente</h1>
            <p className="text-gray-300 text-sm">Crie sua conta para agendar serviços</p>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 max-w-md mx-auto">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="nome" className="block text-sm text-gray-300 mb-2">Nome completo *</label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-gray-300 mb-2">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm text-gray-300 mb-2">Telefone *</label>
                  <input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white"
                    placeholder="(11) 99999-9999"
                    value={formData.telefone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="senha" className="block text-sm text-gray-300 mb-2">Senha *</label>
                  <input
                    id="senha"
                    name="senha"
                    type="password"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.senha}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm text-gray-300 mb-2">Confirmar senha *</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-red-800 text-sm text-center">{error}</div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="text-green-800 text-sm text-center">{success}</div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
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
                  <span className="relative z-10">{isLoading ? 'Cadastrando...' : 'Cadastrar Cliente'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </div>

              <div className="text-center mt-3 space-y-2">
                <p className="text-sm text-gray-400">Já tem uma conta?{' '}
                  <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300">Faça login aqui</Link>
                </p>
                <div className="pt-2">
                  <Link 
                    to="/register/barbershop"
                    className="group relative flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border-2 border-amber-500/50 hover:border-amber-400 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-amber-300 text-sm flex items-center gap-2">
                          Sou Proprietário
                          {' '}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Popular
                          </span>
                        </p>
                        <p className="text-xs text-gray-300">Cadastre sua barbearia</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
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

export default RegisterClient;