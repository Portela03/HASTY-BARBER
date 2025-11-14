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
  CreateRescheduleRequest,
  RescheduleRequestItem,
  ServiceItem,
  CreateServiceRequest,
  BarbeariaConfig,
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
  
  // Log detalhado para debug em produção
  console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
    baseURL: config.baseURL,
    data: config.data,
    params: config.params,
    hasToken: !!token
  });
  
  return config;
});

// Basic response error normalization
api.interceptors.response.use(
  (res) => {
    // Log sucesso em produção
    console.log(`[API SUCCESS] ${res.config.method?.toUpperCase()} ${res.config.url}`, {
      status: res.status,
      dataLength: JSON.stringify(res.data).length
    });
    return res;
  },
  (error) => {
    const status = error?.response?.status as number | undefined;
    const backendMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;
    const noResponse = !error?.response;
    
    // Log detalhado do erro
    console.error(`[API ERROR] ${error?.config?.method?.toUpperCase()} ${error?.config?.url}`, {
      status,
      statusText: error?.response?.statusText,
      backendMessage,
      responseData: error?.response?.data,
      noResponse,
      requestData: error?.config?.data,
      baseURL: error?.config?.baseURL
    });
    
    // Preserve axios error shape but improve message
    error.message = noResponse
      ? `Não foi possível conectar ao servidor de API em ${BASE_URL}. Verifique se o backend está em execução.`
      : status === 401
      ? 'Sua sessão expirou. Faça login novamente.'
      : status === 403
      ? 'Você não tem permissão para esta ação.'
      : backendMessage || 'Erro inesperado na requisição.';
    if (status === 401 || status === 403) {
      (error as any).code = 'AUTH';
    }
    // Preserve original response for existing handlers
    const normalized = new Error(
      status === 401
        ? 'Sua sessão expirou. Faça login novamente.'
        : status === 403
        ? 'Você não tem permissão para esta ação.'
        : backendMessage || 'Erro inesperado na requisição.'
    ) as any;
  normalized.status = status;
    normalized.code = status === 401 || status === 403 ? 'AUTH' : undefined;
    normalized.response = error?.response;
    normalized.data = error?.response?.data;
    // Debug helper: if config PATCH fails with validation error, log request/response for easier debugging
    try {
      const reqUrl: string | undefined = error?.config?.url;
      const method: string | undefined = error?.config?.method;
      if ((status === 400 || status === 422) && method === 'patch' && reqUrl && reqUrl.includes('/barbearias') && reqUrl.includes('/config')) {
        // Try to parse request body
        let reqBody: any = error?.config?.data;
        try {
          reqBody = typeof reqBody === 'string' ? JSON.parse(reqBody) : reqBody;
        } catch (_) {
          // leave as-is
        }
        console.error('Barbearia config PATCH failed. Request payload:', reqBody);
        console.error('Barbearia config PATCH response body:', error?.response?.data);
      }
    } catch (logErr) {
      // ignore logging errors
    }
    return Promise.reject(normalized);
  }
);

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

// Queryable list for barbearia bookings
export async function listBarbeariaBookings(
  id_barbearia: number,
  q?: {
    status?: Array<'pendente' | 'confirmado' | 'cancelado' | 'finalizado'>;
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    mine?: boolean;
    barber_id?: number;
  }
): Promise<BookingResponse[]> {
  const params: any = {};
  if (q?.status) params.status = q.status; // let axios send array as repeated param
  if (q?.startDate) params.startDate = q.startDate;
  if (q?.endDate) params.endDate = q.endDate;
  if (typeof q?.mine === 'boolean') params.mine = q.mine;
  if (q?.barber_id) params.barber_id = q.barber_id;
  const response = await api.get<any[]>(`/api/barbearias/${id_barbearia}/bookings`, { params });
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
}

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
  // Atualizar dados da barbearia
  update: async (
    id_barbearia: number,
    data: Partial<{ nome: string; endereco: string; telefone_contato: string; horario_funcionamento: string }>
  ): Promise<Barbearia> => {
    // Aceitar nomes alternativos de campos do backend se necessário
    const payload: any = {
      nome: (data as any)?.nome ?? (data as any)?.name,
      endereco: (data as any)?.endereco ?? (data as any)?.address,
      telefone_contato: (data as any)?.telefone_contato ?? (data as any)?.telefone ?? (data as any)?.phone,
      horario_funcionamento: (data as any)?.horario_funcionamento ?? (data as any)?.business_hours ?? (data as any)?.horario,
    };
    const res = await api.patch<Barbearia>(`/api/barbearias/${id_barbearia}`, payload);
    return res.data;
  },
};

export const barberService = {
  listByBarbershop: async (
    barbeariaId: number,
    opts?: { onlyActive?: boolean; service?: string }
  ): Promise<Barbeiro[]> => {
    const onlyActive = opts?.onlyActive ?? true;
    const params: any = { onlyActive };
    if (opts?.service) params.service = opts.service;
    const response = await api.get<any[]>(`/api/barbearias/${barbeariaId}/barbeiros`, { params });
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

// User profile
export const userService = {
  updateMe: async (data: Partial<{ nome: string; email: string; telefone: string }>): Promise<import('../types').User> => {
    const res = await api.patch<import('../types').User>('/api/users/me', data);
    return res.data;
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

// Reschedule service (reagendamento com aprovação)
export const rescheduleService = {
  create: async (bookingId: number, data: CreateRescheduleRequest): Promise<RescheduleRequestItem> => {
    const res = await api.post<RescheduleRequestItem>(`/api/bookings/${bookingId}/reschedule-requests`, data);
    return res.data;
  },
  listByBarbershop: async (id_barbearia: number): Promise<RescheduleRequestItem[]> => {
    const res = await api.get<RescheduleRequestItem[]>(`/api/barbearias/${id_barbearia}/reschedule-requests`);
    return res.data || [];
  },
  approve: async (requestId: number): Promise<BookingResponse> => {
    const res = await api.patch<BookingResponse>(`/api/bookings/reschedule-requests/${requestId}/approve`, {});
    return res.data;
  },
  reject: async (requestId: number): Promise<RescheduleRequestItem> => {
    const res = await api.patch<RescheduleRequestItem>(`/api/bookings/reschedule-requests/${requestId}/reject`, {});
    return res.data;
  },
};

// Services (catálogo da barbearia)
export const serviceService = {
  listByBarbershop: async (id_barbearia: number): Promise<ServiceItem[]> => {
    const res = await api.get<any[]>(`/api/barbearias/${id_barbearia}/services`);
    const data = res.data || [];
    return data.map((raw: any): ServiceItem => ({
      id: raw.id ?? raw.service_id ?? raw.idServico ?? raw.id_servico,
      id_barbearia: raw.id_barbearia ?? raw.barbearia_id ?? raw.idBarbearia,
      nome: raw.nome ?? raw.name,
      preco: raw.preco ?? raw.price ?? raw.valor,
      ativo: typeof raw.ativo === 'boolean' ? raw.ativo : (raw.ativo === 1 || raw.is_active === true),
      descricao: raw.descricao ?? raw.description,
    } as ServiceItem));
  },
  create: async (id_barbearia: number, data: CreateServiceRequest): Promise<ServiceItem> => {
    const res = await api.post<ServiceItem>(`/api/barbearias/${id_barbearia}/services`, data);
    return res.data;
  },
  // Delete a service (scoped to a barbearia). Some backends may also support /api/services/:id - we prefer scoped route.
  delete: async (id_barbearia: number, serviceId: number): Promise<void> => {
    const res = await api.delete(`/api/barbearias/${id_barbearia}/services/${serviceId}`);
    if (res.status !== 204 && res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }
  },
  // futuras ações: update/delete/activate
};

// Hidden cutoffs (persist "clear finalized" per user/context)
export type HiddenScope = 'global' | 'barbearia' | 'barbeiro';
export type HiddenCutoffItem = { scope: HiddenScope; scope_id?: number; hidden_before: string };

export async function listHiddenCutoffs(): Promise<HiddenCutoffItem[]> {
  const res = await api.get<{ items?: HiddenCutoffItem[] }>('/api/users/me/hidden-cutoffs');
  const data = res.data;
  return Array.isArray(data?.items) ? data.items! : [];
}

export async function upsertHiddenCutoff(params: {
  scope: HiddenScope;
  scope_id?: number | null;
  hidden_before: string; // ISO UTC
}): Promise<{ scope: HiddenScope; scope_id?: number; hidden_before: string; updated: true }>
{
  const body: any = {
    scope: params.scope,
    hidden_before: params.hidden_before,
  };
  if (params.scope !== 'global') {
    if (!params.scope_id) throw new Error('scope_id é obrigatório para escopos != global');
    body.scope_id = params.scope_id;
  }
  const res = await api.post('/api/users/me/hidden-cutoffs', body);
  return res.data;
}

export async function deleteHiddenCutoff(params: {
  scope: HiddenScope;
  scope_id?: number | null;
}): Promise<void> {
  const body: any = { scope: params.scope };
  if (params.scope !== 'global') {
    if (!params.scope_id) throw new Error('scope_id é obrigatório para escopos != global');
    body.scope_id = params.scope_id;
  }
  const res = await api.delete('/api/users/me/hidden-cutoffs', { data: body });
  if (res.status !== 204 && res.status !== 200) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export function nowUtcIso(): string {
  return new Date().toISOString();
}

export async function clearFinalizadosGlobal() {
  return upsertHiddenCutoff({ scope: 'global', hidden_before: nowUtcIso() });
}

export async function clearFinalizadosBarbearia(barbeariaId: number) {
  return upsertHiddenCutoff({ scope: 'barbearia', scope_id: barbeariaId, hidden_before: nowUtcIso() });
}

export async function clearFinalizadosBarbeiro(barbeiroId: number) {
  return upsertHiddenCutoff({ scope: 'barbeiro', scope_id: barbeiroId, hidden_before: nowUtcIso() });
}

// Barbearia Config (GET/PATCH)
export async function getBarbeariaConfig(id_barbearia: number): Promise<BarbeariaConfig> {
  const res = await api.get(`/api/barbearias/${id_barbearia}/config`);
  const raw = res.data as any;
  const toHHMM = (v: any): string | null => {
    if (v == null) return null;
    const s = String(v);
    // Accept HH:mm or HH:mm:ss and normalize to HH:mm for the UI
    const m = s.match(/^([0-1]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!m) return null;
    return `${m[1]}:${m[2]}`;
  };
  // Normalize windows in days with fallback from minutes
  const cancelDays: number | null =
    typeof raw?.cancel_window_days === 'number'
      ? raw.cancel_window_days
      : typeof raw?.cancel_window_minutes === 'number'
      ? Math.floor(raw.cancel_window_minutes / 1440)
      : null;
  const reschedDays: number | null =
    typeof raw?.reschedule_window_days === 'number'
      ? raw.reschedule_window_days
      : typeof raw?.reschedule_window_minutes === 'number'
      ? Math.floor(raw.reschedule_window_minutes / 1440)
      : null;

  const bhRaw: any[] = Array.isArray(raw?.business_hours) ? raw.business_hours : [];
  // Normalize into a full 7-day array (0..6) so UI always shows all days
  const business_hours: any[] = Array.from({ length: 7 }).map((_, i) => ({ day: i, open: null, close: null }));
  bhRaw.forEach((h) => {
    let dayNorm: number;
    if (typeof h?.day === 'number') {
      dayNorm = h.day;
    } else if (typeof h?.day_of_week === 'number') {
      const dow = h.day_of_week;
      // Backend pode usar 1..7 (Seg=1..Dom=7) ou 0..6; normalizamos para 0..6 com Dom=0
      if (dow >= 1 && dow <= 7) dayNorm = dow === 7 ? 0 : dow;
      else dayNorm = dow; // já 0..6
    } else {
      dayNorm = 0;
    }
    if (typeof dayNorm === 'number' && dayNorm >= 0 && dayNorm <= 6) {
      business_hours[dayNorm] = {
        day: dayNorm,
        open: toHHMM(h?.open ?? h?.open_time),
        close: toHHMM(h?.close ?? h?.close_time),
      };
    }
  });

  const normalized: BarbeariaConfig = {
    duration_minutes: typeof raw?.duration_minutes === 'number' ? raw.duration_minutes : 30,
    cancel_window_days: cancelDays,
    reschedule_window_days: reschedDays,
    cancel_window_minutes: typeof raw?.cancel_window_minutes === 'number' ? raw.cancel_window_minutes : null,
    reschedule_window_minutes: typeof raw?.reschedule_window_minutes === 'number' ? raw.reschedule_window_minutes : null,
    business_hours,
  };
  return normalized;
}

export async function patchBarbeariaConfig(
  id_barbearia: number,
  data: Partial<BarbeariaConfig>
): Promise<BarbeariaConfig> {
  // Send only supported fields: duration_minutes, business_hours, *_window_days
  const payload: any = {};
  if (typeof data.duration_minutes === 'number') payload.duration_minutes = data.duration_minutes;
  // Helper to format times as HH:mm
  const toHHMM = (v: any): string | null => {
    if (v == null || v === '') return null;
    const s = String(v);
    const m = s.match(/^([0-1]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!m) return null;
    return `${m[1]}:${m[2]}`;
  };

  let hadWeekendEntries = false;
  let fullBh: any[] = [];
  if (Array.isArray(data.business_hours)) {
    // Accept several shapes from callers; prefer day_of_week/open_time/close_time with day_of_week 0..6
    fullBh = (data.business_hours || [])
      .map((h: any) => {
        // Normalize possible aliases
        const dow = (typeof h.day_of_week === 'number' ? h.day_of_week : typeof h.day === 'number' ? h.day : undefined);
        const openVal = h.open_time ?? h.open ?? null;
        const closeVal = h.close_time ?? h.close ?? null;
        return { day_of_week: dow, open_time: toHHMM(openVal), close_time: toHHMM(closeVal) };
      })
      .filter((h: any) => h.open_time && h.close_time);
    hadWeekendEntries = (data.business_hours || []).some((h: any) => {
      const day = typeof h.day === 'number' ? h.day : typeof h.day_of_week === 'number' ? h.day_of_week : null;
      return day === 0 || day === 6;
    });
    if (fullBh.length > 0) payload.business_hours = fullBh;
  }
  if (typeof data.cancel_window_days === 'number' || data.cancel_window_days === null) {
    payload.cancel_window_days = data.cancel_window_days;
  }
  if (typeof data.reschedule_window_days === 'number' || data.reschedule_window_days === null) {
    payload.reschedule_window_days = data.reschedule_window_days;
  }
  try {
  // 1. Tenta formato padrão (day_of_week 0..6, open_time/close_time)
  const res = await api.patch<BarbeariaConfig>(`/api/barbearias/${id_barbearia}/config`, payload);
    // Log response for debugging and handle empty responses
    console.log('patchBarbeariaConfig: response status', res.status, 'data:', res.data);
    if (res.status === 204 || res.data == null) {
      // Some backends return 204 No Content; fetch the canonical config
      return await getBarbeariaConfig(id_barbearia);
    }
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    // If the server rejects and we included weekend entries, retry without weekends.
  if ((status === 400 || status === 422) && Array.isArray(data.business_hours) && hadWeekendEntries) {
      try {
        const noWeekendBh = (data.business_hours || [])
          .map((h: any) => {
            const dow = typeof h.day_of_week === 'number' ? h.day_of_week : typeof h.day === 'number' ? h.day : undefined;
            const openVal = h.open_time ?? h.open ?? null;
            const closeVal = h.close_time ?? h.close ?? null;
            return { day_of_week: dow, open_time: toHHMM(openVal), close_time: toHHMM(closeVal) };
          })
          .filter((h: any) => h.open_time && h.close_time && h.day_of_week !== 0 && h.day_of_week !== 6);
        const altPayload: any = { ...payload };
        if (noWeekendBh.length > 0) altPayload.business_hours = noWeekendBh;
        else delete altPayload.business_hours;
        console.warn('Barbearia config: retrying without weekend entries');
  const resNoWeekend = await api.patch<BarbeariaConfig>(`/api/barbearias/${id_barbearia}/config`, altPayload);
  console.log('patchBarbeariaConfig (no-weekend) response status', resNoWeekend.status, 'data:', resNoWeekend.data);
  if (resNoWeekend.status === 204 || resNoWeekend.data == null) return await getBarbeariaConfig(id_barbearia);
  return resNoWeekend.data;
      } catch (errNoWeekend: any) {
        // fall through to other fallback strategies below
      }
    }
      // 2. Tenta formato alternativo (day 0..6, open/close)
    if ((status === 400 || status === 422) && Array.isArray(data.business_hours)) {
      const toHHMMSS = (v: any): string | null => {
        if (v == null || v === '') return null;
        const s = String(v);
        const m = s.match(/^([0-1]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        if (!m) return null;
        const ss = m[3] ?? '00';
        return `${m[1]}:${m[2]}:${ss}`;
      };
      const altPayload: any = { ...payload };
      altPayload.business_hours = data.business_hours.map((h: any) => ({
        day: typeof h.day === 'number' ? h.day : typeof h.day_of_week === 'number' ? h.day_of_week : undefined,
        open: toHHMMSS(h.open ?? h.open_time),
        close: toHHMMSS(h.close ?? h.close_time),
      }));
      try {
  const res2 = await api.patch<BarbeariaConfig>(`/api/barbearias/${id_barbearia}/config`, altPayload);
  console.log('patchBarbeariaConfig (alt1) response status', res2.status, 'data:', res2.data);
  if (res2.status === 204 || res2.data == null) return await getBarbeariaConfig(id_barbearia);
  return res2.data;
      } catch (err2: any) {
        // 3. Tenta formato day_of_week 0..6, open_time/close_time
        const altPayload2: any = { ...payload };
        altPayload2.business_hours = data.business_hours.map((h: any) => ({
          day_of_week: typeof h.day_of_week === 'number' ? h.day_of_week : typeof h.day === 'number' ? h.day : undefined,
          open_time: toHHMMSS(h.open ?? h.open_time),
          close_time: toHHMMSS(h.close ?? h.close_time),
        }));
        try {
          const res3 = await api.patch<BarbeariaConfig>(`/api/barbearias/${id_barbearia}/config`, altPayload2);
            console.log('patchBarbeariaConfig (alt2) response status', res3.status, 'data:', res3.data);
            if (res3.status === 204 || res3.data == null) return await getBarbeariaConfig(id_barbearia);
            return res3.data;
        } catch (err3: any) {
          throw err3;
        }
      }
    }
    throw err;
  }
}