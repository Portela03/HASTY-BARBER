import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginData {
  email: string;
  senha: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: {
    id_usuario: number;
    nome: string;
    email: string;
    tipo_usuario: string;
  };
}

export interface RegisterClientData {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface RegisterClientResponse {
  message: string;
  cliente?: {
    id_usuario: number;
    nome: string;
    email: string;
  };
}

export interface RegisterBarbershopData {
  barbearia_nome: string;
  endereco: string;
  telefone_contato: string;
  horario_funcionamento: string;
  proprietario_nome: string;
  proprietario_email: string;
  proprietario_telefone: string;
  proprietario_senha: string;
}

export interface RegisterBarbershopResponse {
  message: string;
  token: string;
  proprietario: {
    id_usuario: number;
    nome: string;
    email: string;
    tipo_usuario: string;
  };
  barbearia: {
    id_barbearia: number;
    nome: string;
    endereco: string;
  };
}

export interface ValidateTokenResponse {
  valid: boolean;
  usuario?: {
    id_usuario: number;
    nome: string;
    email: string;
    tipo_usuario: string;
  };
}

// Serviços de autenticação
export const authService = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
  },

  validateToken: async (): Promise<ValidateTokenResponse> => {
    const response = await api.get('/api/auth/validate');
    return response.data;
  },
};

// Serviços de registro
export const registerService = {
  registerClient: async (data: RegisterClientData): Promise<RegisterClientResponse> => {
    const response = await api.post('/api/client/register', data);
    return response.data;
  },

  registerBarbershop: async (data: RegisterBarbershopData): Promise<RegisterBarbershopResponse> => {
    const response = await api.post('/api/onboarding/barbershop', data);
    return response.data;
  },
};

export default api;