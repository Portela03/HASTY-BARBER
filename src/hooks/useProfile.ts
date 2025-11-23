import { useState } from 'react';
import { User } from '../../types';
import { userService } from '../../services/api';

interface UseProfileProps {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onWarning: (message: string) => void;
}

export const useProfile = ({ user, token, login, onSuccess, onError, onWarning }: UseProfileProps) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const emailRegex = /^([^\s@]+)@([^\s@]+)\.[^\s@]+$/;
  
  const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
  
  const formatPhoneBR = (s: string) => {
    const d = onlyDigits(s).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const openProfileModal = () => {
    if (!user) return;
    setProfileNome(user.nome || '');
    setProfileEmail(user.email || '');
    const currentPhone = (user as any)?.telefone ?? (user as any)?.phone ?? '';
    setProfileTelefone(currentPhone ? formatPhoneBR(currentPhone) : '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const nome = profileNome.trim();
    const email = profileEmail.trim();
    
    if (nome.length < 2) {
      onWarning('Informe um nome válido.');
      return;
    }
    if (!emailRegex.test(email)) {
      onWarning('Informe um email válido.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const telDigits = onlyDigits(profileTelefone);
      const updated = await userService.updateMe({ nome, email, telefone: telDigits || undefined });
      
      if (token) {
        const merged = { ...user, ...updated, avatar_url: updated.avatar_url ?? user.avatar_url } as User;
        login(token, merged);
      }
      
      setShowProfileModal(false);
      onSuccess('Dados atualizados.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar dados.';
      onError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    showProfileModal,
    setShowProfileModal,
    profileNome,
    setProfileNome,
    profileEmail,
    setProfileEmail,
    profileTelefone,
    setProfileTelefone,
    isUpdating,
    openProfileModal,
    handleSaveProfile,
    formatPhoneBR,
  };
};
