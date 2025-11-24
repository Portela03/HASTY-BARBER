import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { serviceService } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const RegisterService: React.FC = () => {
  const { id } = useParams();
  const barbershopId = Number(id || 0);
  const navigate = useNavigate();
  const { toasts, removeToast, success, error, warning } = useToast();

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<any[] | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [view, setView] = useState<'form' | 'manage'>('form');

  const handleSubmit = async () => {
    if (!nome) return warning('Informe o nome do serviço.');
    setIsSubmitting(true);
    try {
      const priceNum = preco ? Number(preco.replace(',', '.')) : undefined;
      await serviceService.create(barbershopId, { nome, preco: priceNum, descricao: descricao || undefined });
      success('Serviço cadastrado com sucesso.');
      setView('manage');
      await loadServices();
    } catch (err: any) {
      error(err?.message || 'Erro ao cadastrar serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadServices = async () => {
    if (!barbershopId) return;
    setIsLoadingServices(true);
    try {
      const data = await serviceService.listByBarbershop(barbershopId);
      setServices(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar serviços', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleDelete = async (svcId: number) => {
    if (!confirm('Remover este serviço? Esta ação não pode ser desfeita.')) return;
    try {
      await serviceService.delete(barbershopId, svcId);
      success('Serviço removido.');
      await loadServices();
    } catch (err: any) {
      error(err?.message || 'Erro ao remover serviço.');
    }
  };

  React.useEffect(() => { loadServices(); }, [barbershopId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-amber-400 group">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar</span>
            </button>
            <h1 className="text-4xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-3">Cadastrar Serviço</h1>
            <p className="text-gray-300 text-sm">Adicione um novo serviço ao catálogo da barbearia</p>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView('form')}
            className={`relative px-4 py-2 rounded-lg font-medium overflow-hidden group ${view === 'form' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300'}`}
          >
            <span className="relative z-10">Cadastrar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
          <button
            type="button"
            onClick={() => setView('manage')}
            className={`relative px-4 py-2 rounded-lg font-medium overflow-hidden group ${view === 'manage' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300'}`}
          >
            <span className="relative z-10">Gerenciar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>

        {view === 'form' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Nome do Serviço</label>
                <input placeholder="Corte clássico" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Preço (ex: 45.00)</label>
                <input placeholder="35.00" value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Descrição (opcional)</label>
                <textarea placeholder="Descrição curta do serviço (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white resize-none" rows={4} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="relative flex-1 bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 rounded-lg font-semibold transform transition-transform duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
              >
                <span className="relative z-10">Cancelar</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`relative flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-gray-900 py-3 rounded-lg font-semibold transform transition-transform duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'overflow-hidden group hover:-translate-y-1'}`}
              >
                <span className="relative z-10">{isSubmitting ? 'Enviando...' : 'Cadastrar Serviço'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          </div>
        )}

        {view === 'manage' && (
          <div className="mt-6 bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-4">Serviços cadastrados</h2>
            {isLoadingServices ? (
              <div className="text-center py-6 text-gray-400">Carregando serviços…</div>
            ) : !services || services.length === 0 ? (
              <div className="text-gray-400">Nenhum serviço cadastrado.</div>
            ) : (
              <div className="space-y-3">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div>
                      <div className="text-white font-semibold">{s.nome}</div>
                      <div className="text-sm text-gray-300">R$ {typeof s.preco === 'number' ? s.preco.toFixed(2) : s.preco} {s.descricao ? `• ${s.descricao}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDelete(s.id)} className="relative px-3 py-1 rounded-md text-sm bg-red-600 text-white overflow-hidden group">
                        <span className="relative z-10">Remover</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        </div>

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegisterService;
