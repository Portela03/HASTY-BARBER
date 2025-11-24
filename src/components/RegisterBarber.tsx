import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { barberService, serviceService } from '../services/api';
import { formatPhoneBR, normalizePhoneToDigits } from '../utils/phone';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const RegisterBarber: React.FC = () => {
  const { id } = useParams();
  const barbershopId = Number(id || 0);
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
  const { toasts, removeToast, success, error, warning } = useToast();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [especialidades] = useState('');
  const [services, setServices] = useState<any[] | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const formatPrice = (p: any) => {
    if (p == null || p === '') return '';
    const n = Number(String(p).replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (Number.isNaN(n)) return String(p);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barbers, setBarbers] = useState<any[] | null>(null);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [view, setView] = useState<'form' | 'manage'>('form');

  const handleSubmit = async () => {
    if (!nome) return warning('Informe o nome do barbeiro.');
    if (!email) return warning('Informe o email do barbeiro.');
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) return warning('Informe um email válido.');
    setIsSubmitting(true);
    try {
      
      if (!senha) {
        warning('Informe a senha para o barbeiro.');
        setIsSubmitting(false);
        return;
      }
      if (senha.length < 6) {
        warning('A senha deve ter ao menos 6 caracteres.');
        setIsSubmitting(false);
        return;
      }
      if (senha !== confirmarSenha) {
        warning('As senhas não coincidem.');
        setIsSubmitting(false);
        return;
      }

      const selectedServicesDetails = (selectedServices || []).map((id) => {
        const svc = (services || []).find(s => s.id === id);
        return svc ? { id: svc.id, nome: svc.nome, preco: svc.preco } : { id };
      });

      const payload: any = {
        nome,
        telefone: normalizePhoneToDigits(telefone) || undefined,
        email: email || undefined,
        senha,
        especialidades: (selectedServices && selectedServices.length > 0)
          ? selectedServicesDetails.map((s: any) => s.nome).filter(Boolean).join(', ')
          : (especialidades || undefined),
        selected_services: selectedServicesDetails.length > 0 ? selectedServicesDetails : undefined,
        id_barbearia: barbershopId || undefined,
      };

      await barberService.create(payload);

      success('Barbeiro cadastrado com sucesso.');
      setView('manage');
      await loadBarbers();
    } catch (err: any) {
      const msg = err?.message || 'Erro ao cadastrar barbeiro.';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadBarbers = async () => {
    if (!barbershopId) return;
    setIsLoadingBarbers(true);
    try {
      const data = await barberService.listByBarbershop(barbershopId, { onlyActive: false });
      setBarbers(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar barbeiros', err);
    } finally {
      setIsLoadingBarbers(false);
    }
  };

  const loadServices = async () => {
    if (!barbershopId) return;
    try {
      const data = await serviceService.listByBarbershop(barbershopId);
      setServices(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar serviços', err);
    }
  };

  const toggleActive = async (b: any) => {
    try {
      const idUser = b.id_barbeiro ?? b.id_usuario ?? b.id ?? null;
      if (!idUser) return;
      
      const currentlyActive = Boolean(
        b.ativo === true || b.ativo === 'ativo' || b.ativo === '1' || b.ativo === 1
      );
      setUpdatingId(idUser);
      await barberService.setActive(idUser, !currentlyActive);
      success(`Barbeiro ${!currentlyActive ? 'ativado' : 'desativado'} com sucesso.`);
      await loadBarbers();
    } catch (err: any) {
      error(err?.message || 'Erro ao atualizar status do barbeiro.');
    } finally {
      setUpdatingId(null);
    }
  };

  React.useEffect(() => { loadBarbers(); loadServices(); }, [barbershopId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10">
            <button onClick={goBack} className="mb-4 flex items-center gap-2 text-amber-400 group">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar</span>
            </button>
            <h1 className="text-4xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-3">Cadastrar Barbeiro</h1>
            <p className="text-gray-300 text-sm">Adicione um novo barbeiro à barbearia</p>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView('form')}
            className={`relative px-4 py-2 rounded-lg font-medium overflow-hidden group transform transition-transform duration-200 ${view === 'form' ? 'bg-amber-500 text-gray-900 hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
          >
            <span className="relative z-10">Cadastrar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
          <button
            type="button"
            onClick={() => setView('manage')}
            className={`relative px-4 py-2 rounded-lg font-medium overflow-hidden group transform transition-transform duration-200 ${view === 'manage' ? 'bg-amber-500 text-gray-900 hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
          >
            <span className="relative z-10">Gerenciar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>

        {view === 'form' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Nome</label>
                <input placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Telefone</label>
                <input placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(formatPhoneBR(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Email</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Senha</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Confirmar senha</label>
                <input type="password" placeholder="Digite a senha novamente" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Especialidades (selecione serviços)</label>
                {services && services.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {services.map((s) => {
                      const active = selectedServices.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedServices(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                          }}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg text-sm font-medium border transition-colors duration-150 ${active ? 'bg-amber-500 text-gray-900 border-amber-400 shadow-md ring-2 ring-amber-300' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-amber-400'}`}
                        >
                          <div className="truncate w-full text-sm font-semibold">{s.nome}</div>
                          {s.preco !== undefined && s.preco !== null && (
                            <div className="text-xs text-gray-400">{formatPrice(s.preco)}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 mt-2">Nenhum serviço cadastrado na barbearia.</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={goBack}
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
                <span className="relative z-10">{isSubmitting ? 'Enviando...' : 'Cadastrar'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          </div>
        )}

        {view === 'manage' && (
          <div className="mt-6 bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-4">Barbeiros cadastrados</h2>
            {isLoadingBarbers ? (
              <div className="text-center py-6 text-gray-400">Carregando barbeiros…</div>
            ) : !barbers || barbers.length === 0 ? (
              <div className="text-gray-400">Nenhum barbeiro encontrado.</div>
            ) : (
              <div className="space-y-3">
                {barbers.map((b) => (
                  <div key={b.id_barbeiro ?? b.id_usuario} className="flex items-center justify-between bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center gap-3">
                      {b.avatar_url ? (
                        <img src={b.avatar_url} alt={b.nome} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">{(b.nome || '?').charAt(0)}</div>
                      )}
                      <div>
                        <div className="text-white font-semibold">{b.nome}</div>
                        <div className="text-sm text-gray-300">{b.especialidades}</div>
                      </div>
                    </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActive(b)}
                            disabled={updatingId === (b.id_barbeiro ?? b.id_usuario)}
                            className={`relative px-3 py-1 rounded-md text-sm overflow-hidden group ${b.ativo ? 'bg-gray-600 text-white' : 'bg-amber-500 text-gray-900'} ${updatingId === (b.id_barbeiro ?? b.id_usuario) ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <span className="relative z-10">{updatingId === (b.id_barbeiro ?? b.id_usuario) ? 'Atualizando...' : (b.ativo ? 'Desativar' : 'Ativar')}</span>
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

export default RegisterBarber;
