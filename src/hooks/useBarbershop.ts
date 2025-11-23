import { useState } from 'react';
import type { Barbearia, ApiErrorResponse } from '../types';
import { barbershopService } from '../services/api';

export interface UseBarbershopParams {
  selectedShopId: number | '';
  setSelectedShopId: React.Dispatch<React.SetStateAction<number | ''>>;
  barbershops: Barbearia[];
  setBarbershops: React.Dispatch<React.SetStateAction<Barbearia[]>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onWarning: (message: string) => void;
}

export const useBarbershop = ({
  selectedShopId,
  setSelectedShopId,
  barbershops,
  setBarbershops,
  onSuccess,
  onError,
  onWarning,
}: UseBarbershopParams) => {
  const [showBarbershopModal, setShowBarbershopModal] = useState(false);
  const [bsNome, setBsNome] = useState('');
  const [bsEndereco, setBsEndereco] = useState('');
  const [bsTelefone, setBsTelefone] = useState('');
  const [bsHorario, setBsHorario] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

  const openBarbershopModal = async () => {
    let shopId = selectedShopId ? Number(selectedShopId) : undefined;
    
    if (!shopId) {
      try {
        let data: Barbearia[] = [];
        try {
          data = await barbershopService.listMine();
        } catch {
          data = await barbershopService.list();
        }
        setBarbershops(data);
        if (data[0]) {
          shopId = data[0].id_barbearia;
          setSelectedShopId(shopId ?? '');
        }
      } catch {
        // ignore
      }
    }
    
    if (!shopId) {
      onError('Nenhuma barbearia encontrada para editar.');
      return;
    }
    
    const shop = barbershops.find((b: Barbearia) => b.id_barbearia === shopId);
    if (shop) {
      setBsNome(shop.nome || '');
      setBsEndereco(shop.endereco || '');
      setBsTelefone(shop.telefone_contato || '');
      setBsHorario(shop.horario_funcionamento || '');
    }
    setShowBarbershopModal(true);
  };

  const handleSaveBarbershop = async () => {
    if (!selectedShopId) {
      onWarning('Nenhuma barbearia selecionada.');
      return;
    }
    
    const nome = bsNome.trim();
    if (nome.length < 2) {
      onWarning('Informe um nome válido para a barbearia.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const telDigits = onlyDigits(bsTelefone);
      const updated = await barbershopService.update(Number(selectedShopId), {
        nome,
        endereco: bsEndereco.trim(),
        telefone_contato: telDigits || undefined,
        horario_funcionamento: bsHorario.trim(),
      });
      
      setBarbershops((prev: Barbearia[]) => (prev || []).map((b: Barbearia) => b.id_barbearia === updated.id_barbearia ? updated : b));
      setShowBarbershopModal(false);
      onSuccess('Dados da barbearia atualizados.');
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      const msg = error?.response?.data?.message || error.message || 'Erro ao atualizar barbearia.';
      onError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    showBarbershopModal,
    setShowBarbershopModal,
    bsNome,
    setBsNome,
    bsEndereco,
    setBsEndereco,
    bsTelefone,
    setBsTelefone,
    bsHorario,
    setBsHorario,
    isUpdating,
    openBarbershopModal,
    handleSaveBarbershop,
  };
};
