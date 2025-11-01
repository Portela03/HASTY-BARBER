import axios from 'axios';
import type { 
  LoginData, 
  LoginResponse, 
  RegisterClientData, 
  RegisterClientResponse, 
  RegisterBarbershopData, 
  RegisterBarbershopResponse, 
  ValidateTokenResponse,
  BookingRequest,
  BookingResponse,
  Barbearia,
  Barbeiro,
  CreateBarberRequest,
  CreateReviewRequest,
  ReviewsListResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log('API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
  },

  validateToken: async (): Promise<ValidateTokenResponse> => {
    const response = await api.get<ValidateTokenResponse>('/api/auth/validate');
    return response.data;
  },
};

export const registerService = {
  registerClient: async (data: RegisterClientData): Promise<RegisterClientResponse> => {
    const response = await api.post<RegisterClientResponse>('/api/client/register', data);
    return response.data;
  },

  registerBarbershop: async (data: RegisterBarbershopData): Promise<RegisterBarbershopResponse> => {
    const response = await api.post<RegisterBarbershopResponse>('/api/onboarding/barbershop', data);
    return response.data;
  },
};

export const bookingService = {
  create: async (data: BookingRequest): Promise<BookingResponse> => {
    const response = await api.post<BookingResponse>('/api/bookings', data);
    return response.data;
  },
  // Placeholder for future use
  listMine: async (): Promise<BookingResponse[]> => {
    // Aceita formatos variados do backend e normaliza para o front
    const response = await api.get<any[]>('/api/bookings/me');
    const data = response.data || [];
    const mapStatus = (s: any): BookingResponse['status'] => {
      const v = String(s || '').toLowerCase();
      if (v === 'pending') return 'pendente';
      if (v === 'confirmed') return 'confirmado';
      if (v === 'cancelled') return 'cancelado';
      if (v === 'finalized') return 'finalizado';
      // já em PT-BR
      if (v === 'pendente' || v === 'confirmado' || v === 'cancelado' || v === 'finalizado') return v as any;
      return 'pendente';
    };
    return data.map((raw: any) => ({
      id: raw.id,
      id_barbearia:
        raw.id_barbearia ?? raw.barbearia_id ?? raw.idBarbearia ?? raw.barbershop_id ?? raw.barbearia?.id_barbearia,
      service: raw.service,
      date: raw.date,
      time: raw.time,
      barber_id: raw.barber_id ?? raw.id_barbeiro ?? raw.barbeiro?.id_barbeiro,
      barbeiro: raw.barbeiro ?? (raw.barber_name || raw.barber)
        ? {
            id_barbeiro: raw.barber_id ?? raw.id_barbeiro ?? raw.barbeiro?.id_barbeiro,
            nome: raw.barbeiro?.nome ?? raw.barber_name ?? raw.barber,
            telefone: raw.barbeiro?.telefone ?? raw.barber_phone,
            avatar_url: raw.barbeiro?.avatar_url ?? raw.barbeiro?.foto_perfil ?? raw.barber_avatar_url ?? raw.barber_avatar,
          }
        : undefined,
      notes: raw.notes,
      status: mapStatus(raw.status),
      createdAt: raw.createdAt ?? raw.created_at,
      barbearia: raw.barbearia,
      barbearia_nome: raw.barbearia_nome ?? raw.barbearia?.nome,
    }));
  },
  listByBarbershop: async (barbeariaId: number): Promise<BookingResponse[]> => {
    const response = await api.get<any[]>(`/api/barbearias/${barbeariaId}/bookings`);
    const data = response.data || [];
    const mapStatus = (s: any): BookingResponse['status'] => {
      const v = String(s || '').toLowerCase();
      if (v === 'pending') return 'pendente';
      if (v === 'confirmed') return 'confirmado';
      if (v === 'cancelled') return 'cancelado';
      if (v === 'finalized') return 'finalizado';
      if (v === 'pendente' || v === 'confirmado' || v === 'cancelado' || v === 'finalizado') return v as any;
      return 'pendente';
    };
    return data.map((raw: any) => ({
      id: raw.id,
      id_barbearia: raw.id_barbearia ?? raw.barbearia_id ?? raw.idBarbearia ?? raw.barbershop_id ?? raw.barbearia?.id_barbearia,
      service: raw.service,
      date: raw.date,
      time: raw.time,
      barber_id: raw.barber_id ?? raw.id_barbeiro ?? raw.barbeiro?.id_barbeiro,
      barbeiro: raw.barbeiro ?? (raw.barber_name || raw.barber)
        ? {
            id_barbeiro: raw.barber_id ?? raw.id_barbeiro ?? raw.barbeiro?.id_barbeiro,
            nome: raw.barbeiro?.nome ?? raw.barber_name ?? raw.barber,
            telefone: raw.barbeiro?.telefone ?? raw.barber_phone,
            avatar_url: raw.barbeiro?.avatar_url ?? raw.barbeiro?.foto_perfil ?? raw.barber_avatar_url ?? raw.barber_avatar,
          }
        : undefined,
      cliente: raw.cliente
        ? {
            id_usuario: raw.cliente.id_usuario ?? raw.cliente.usuario_id ?? raw.cliente.id,
            nome: raw.cliente.nome ?? raw.cliente.name,
            email: raw.cliente.email,
            telefone: raw.cliente.telefone ?? raw.cliente.phone,
            avatar_url: raw.cliente.avatar_url ?? raw.cliente.foto_perfil ?? raw.cliente.avatar ?? raw.customer_avatar_url,
          }
        : (raw.cliente_nome || raw.customer_name)
        ? {
            nome: raw.cliente_nome ?? raw.customer_name,
            email: raw.cliente_email ?? raw.customer_email,
            telefone: raw.cliente_telefone ?? raw.customer_phone,
          }
        : undefined,
      notes: raw.notes,
      status: mapStatus(raw.status),
      createdAt: raw.createdAt ?? raw.created_at,
      barbearia: raw.barbearia,
      barbearia_nome: raw.barbearia_nome ?? raw.barbearia?.nome,
    }));
  },
  cancel: async (id: number): Promise<BookingResponse> => {
    const response = await api.patch<BookingResponse>(`/api/bookings/${id}/cancel`, {});
    return response.data;
  },
  confirm: async (id: number): Promise<BookingResponse> => {
    const response = await api.patch<BookingResponse>(`/api/bookings/${id}/confirm`, {});
    return response.data;
  },
  finalize: async (id: number): Promise<BookingResponse> => {
    const response = await api.patch<BookingResponse>(`/api/bookings/${id}/finalize`, {});
    return response.data;
  },
};

export const barbershopService = {
  list: async (): Promise<Barbearia[]> => {
    const response = await api.get<Barbearia[]>('/api/barbearias');
    return response.data;
  },
  // Opcional: se o backend expuser somente as do usuário associado
  listMine: async (): Promise<Barbearia[]> => {
    const response = await api.get<Barbearia[]>('/api/barbearias/me');
    return response.data;
  },
};

export const barberService = {
  listByBarbershop: async (barbeariaId: number, opts?: { onlyActive?: boolean }): Promise<Barbeiro[]> => {
    const onlyActive = opts?.onlyActive ?? true;
    const response = await api.get<any[]>(`/api/barbearias/${barbeariaId}/barbeiros`, { params: { onlyActive } });
    const data = response.data || [];
    return data.map((raw: any): Barbeiro => {
      const id_barbeiro = raw.id_barbeiro ?? raw.barbeiro_id ?? raw.idBarbeiro ?? undefined;
      return {
        id_barbeiro,
        id_usuario: raw.id_usuario ?? raw.user_id ?? raw.usuario_id,
        nome: raw.nome ?? raw.name,
        email: raw.email,
        telefone: raw.telefone ?? raw.phone,
        ativo: typeof raw.ativo === 'boolean' ? raw.ativo : (raw.ativo === 1 || raw.ativo === 'ativo' || raw.is_active === true || raw.active === 1),
        especialidades: raw.especialidades ?? raw.specialties ?? raw.especialidade,
        avatar_url: raw.avatar_url ?? raw.foto_perfil ?? raw.avatar ?? raw.profile_photo,
      } as Barbeiro;
    });
  },
  create: async (data: CreateBarberRequest): Promise<Barbeiro> => {
    const response = await api.post<Barbeiro>('/api/barbeiros', data);
    return response.data;
  },
  // Opcional: ativar/desativar barbeiro
  setActive: async (id_usuario: number, ativo: boolean): Promise<Barbeiro> => {
    const response = await api.patch<Barbeiro>(`/api/barbeiros/${id_usuario}/status`, { ativo });
    return response.data;
  },
};

export const uploadService = {
  uploadUserAvatar: async (file: File): Promise<{ avatar_url: string; usuario: import('../types').User }> => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await api.post('/api/users/me/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadBarberAvatar: async (id_barbeiro: number, file: File): Promise<{ avatar_url: string; barbeiro: Barbeiro }> => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await api.post(`/api/barbeiros/${id_barbeiro}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default api;
// Reviews service
export const evaluationService = {
  create: async (data: CreateReviewRequest): Promise<void> => {
    await api.post('/api/avaliacoes', data);
  },
  listByBarbershop: async (id_barbearia: number): Promise<ReviewsListResponse> => {
    const res = await api.get<ReviewsListResponse>(`/api/barbearias/${id_barbearia}/avaliacoes`);
    return res.data;
  },
  listByBarber: async (id_barbeiro: number): Promise<ReviewsListResponse> => {
    const res = await api.get<ReviewsListResponse>(`/api/barbeiros/${id_barbeiro}/avaliacoes`);
    return res.data;
  },
};