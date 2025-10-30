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
    const response = await api.get<BookingResponse[]>('/api/bookings/me');
    return response.data;
  },
  cancel: async (id: number): Promise<BookingResponse> => {
    const response = await api.patch<BookingResponse>(`/api/bookings/${id}/cancel`, {});
    return response.data;
  },
};

export default api;