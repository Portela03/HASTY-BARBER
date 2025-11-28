import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import { barbershopService } from '../services/api';
import type { Barbearia } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Normaliza concatenação entre API_BASE e endpoint
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/,'')}/${path.replace(/^\/+/,'')}`.replace(/\/{2,}/g,'/');

// ====== Utilitários de Log/Diagnóstico ======
const makeReqId = () => `RPT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const maskToken = (t?: string | null) => (t && t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)}` : t || 'none');
const getEnvInfo = () => ({
  apiBase: API_BASE,
  location: {
    origin: window.location.origin,
    href: window.location.href,
    protocol: window.location.protocol,
    isHttps: window.location.protocol === 'https:',
  },
  sameOrigin: (() => {
    try { return new URL(API_BASE, window.location.href).origin === window.location.origin; } catch { return false; }
  })(),
  viteApiUrl: (import.meta as any).env?.VITE_API_URL ?? null,
});
const getDeviceInfo = () => ({
  userAgent: navigator.userAgent,
  platform: (navigator as any).platform,
  language: navigator.language,
  onLine: navigator.onLine,
});

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();

  const [barbershopId, setBarbershopId] = useState<number | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user || user.tipo_usuario !== 'proprietario') {
        navigate('/dashboard');
        return;
      }

      try {
        let shops: Barbearia[] = [];
        try {
          shops = await barbershopService.listMine();
        } catch {
          shops = await barbershopService.list();
        }
        
        if (shops.length > 0) {
          setBarbershopId(shops[0].id_barbearia);
        } else {
          showError('Nenhuma barbearia encontrada para gerar relatórios.');
        }
      } catch (err) {
        showError('Erro ao carregar barbearia.');
      } finally {
        setIsLoadingShop(false);
      }
    };

    loadBarbershop();
  }, [user, navigate, showError]);

  const downloadReport = async (type: 'agendamentos' | 'performance' | 'fidelidade') => {
    if (!barbershopId) {
      showError('Nenhuma barbearia selecionada.');
      return;
    }

    const reqId = makeReqId();
    setDownloadingReport(type);

    try {
      // Checagem de mixed content (https front + http API)
      const isHttps = window.location.protocol === 'https:';
      if (isHttps && String(API_BASE).startsWith('http://')) {
        console.error(`[${reqId}] Mixed content detectado: front HTTPS e API HTTP (${API_BASE}).`);
        showError(`API em http bloqueada por HTTPS. Ajuste VITE_API_URL para https. [${reqId}]`);
        return;
      }

      let endpoint = '';
      switch (type) {
        case 'agendamentos':
          endpoint = `/api/reports/excel/agendamentos?barbearia_id=${barbershopId}`;
          break;
        case 'performance':
          endpoint = `/api/reports/excel/performance?barbearia_id=${barbershopId}`;
          break;
        case 'fidelidade':
          endpoint = `/api/reports/excel/fidelidade?barbearia_id=${barbershopId}`;
          break;
      }

      const token = localStorage.getItem('token');
      const url = joinUrl(API_BASE, endpoint);
      const options: RequestInit = {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        mode: 'cors',
      };

      console.groupCollapsed(`[Reports] Download ${type} (${reqId})`);
      console.log('Pré-verificações:', {
        reqId,
        navigatorOnline: navigator.onLine,
        apiBase: API_BASE,
        finalUrl: url,
        httpsFrontend: isHttps,
        token: maskToken(token),
      });

      // Timeout com AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      options.signal = controller.signal;

      const start = performance.now();
      const response = await fetch(url, options);
      const durationMs = Math.round(performance.now() - start);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || 'unknown';
      const contentLength = response.headers.get('content-length') || 'unknown';
      console.log('Response meta:', {
        status: response.status,
        statusText: response.statusText,
        durationMs,
        contentType,
        contentLength,
      });

      if (!response.ok) {
        let parsedError: any = null;
        let rawText: string | null = null;
        try {
          if (contentType.includes('application/json')) {
            parsedError = await response.json();
          } else {
            rawText = await response.text();
          }
        } catch {}
        console.error('Response error body:', parsedError || rawText || '(sem corpo)');
        throw new Error(parsedError?.message || `Erro ao baixar relatório (status ${response.status})`);
      }

      const blob = await response.blob();
      console.log('Blob:', { size: blob.size, type: blob.type });

      const urlObject = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObject;
      a.download = `relatorio_${type}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObject);
      document.body.removeChild(a);

      console.log('Status: sucesso');
      success(`Relatório baixado com sucesso! [${reqId}]`);
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      const isNetwork =
        err instanceof TypeError && /fetch/i.test(err.message || '') ||
        /Failed to fetch/i.test(String(err?.message));

      // Diagnósticos adicionais
      const diagnostics = {
        online: navigator.onLine,
        apiBase: API_BASE,
        frontendProtocol: window.location.protocol,
        mixedContent: window.location.protocol === 'https:' && String(API_BASE).startsWith('http://'),
        suggestions: [
          'Verifique se o dispositivo está online.',
          'Garanta que a API esteja acessível no mesmo host/rede.',
          'Se o front está em HTTPS, configure a API para HTTPS.',
          'Revise CORS no backend (Access-Control-Allow-Origin e Authorization).',
          'Teste a URL diretamente no navegador/Postman.',
          'Cheque DNS/VPN/Firewall em dispositivos problemáticos.',
        ],
      };

      console.error('Erro no download de relatório:', { reqId, error: err, diagnostics });

      if (isAbort) {
        showError(`Tempo excedido ao baixar relatório. [${reqId}]`);
      } else if (!navigator.onLine) {
        showError(`Dispositivo offline. Verifique a conexão. [${reqId}]`);
      } else if (diagnostics.mixedContent) {
        showError(`Bloqueio por mixed content (HTTPS/HTTP). Ajuste VITE_API_URL. [${reqId}]`);
      } else if (isNetwork) {
        showError(`Falha de rede ao conectar no servidor. Veja o console para detalhes. [${reqId}]`);
      } else {
        showError(`${err?.message || 'Erro ao baixar relatório.'} [${reqId}]`);
      }
    } finally {
      console.groupEnd?.();
      setDownloadingReport(null);
    }
  };

  if (isLoadingShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10">
            <button onClick={() => navigate('/dashboard')} className="mb-4 flex items-center gap-2 text-amber-400 group">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar ao Dashboard</span>
            </button>
            <h1 className="text-5xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-3">Relatórios da Barbearia</h1>
            <p className="text-gray-300 text-sm">Baixe relatórios em Excel com dados detalhados</p>
          </div>
        </div>

        {/* Cards de Relatórios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Agendamentos Detalhados */}
          <div className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-2xl shadow-xl p-6 border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Agendamentos</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6">
              Histórico completo de agendamentos com dados de clientes, barbeiros e avaliações.
            </p>
            <button
              onClick={() => downloadReport('agendamentos')}
              disabled={downloadingReport === 'agendamentos'}
              className={`relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white overflow-hidden group ${
                downloadingReport === 'agendamentos'
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="relative z-10">
                {downloadingReport === 'agendamentos' ? 'Baixando...' : 'Baixar Excel'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>

          {/* Performance Barbeiros */}
          <div className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-2xl shadow-xl p-6 border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Performance</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6">
              Análise de desempenho dos barbeiros com estatísticas e avaliações.
            </p>
            <button
              onClick={() => downloadReport('performance')}
              disabled={downloadingReport === 'performance'}
              className={`relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white overflow-hidden group ${
                downloadingReport === 'performance'
                  ? 'bg-green-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="relative z-10">
                {downloadingReport === 'performance' ? 'Baixando...' : 'Baixar Excel'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>

          {/* Fidelidade Clientes */}
          <div className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-2xl shadow-xl p-6 border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <svg className="h-8 w-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Fidelidade</h3>
            </div>
            <p className="text-sm text-gray-300 mb-11">
              Análise de clientes fiéis com histórico de gastos e frequência.
            </p>
            <button
              onClick={() => downloadReport('fidelidade')}
              disabled={downloadingReport === 'fidelidade'}
              className={`relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white overflow-hidden group ${
                downloadingReport === 'fidelidade'
                  ? 'bg-purple-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600'
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="relative z-10">
                {downloadingReport === 'fidelidade' ? 'Baixando...' : 'Baixar Excel'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-blue-200">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium mb-1">Sobre os relatórios</p>
              <p>Os arquivos são gerados em formato Excel (.xlsx) com dados atualizados da sua barbearia. Todos os relatórios incluem formatação e são prontos para análise.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
