
export interface User {
  id_usuario: number;
  nome: string;
  email: string;
  tipo_usuario: string; 
  avatar_url?: string; // URL da foto de perfil
}


export interface LoginData {
  email: string;
  senha: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: User;
}

export interface ValidateTokenResponse {
  valid: boolean;
  usuario?: User;
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


export interface Barbearia {
  id_barbearia: number;
  nome: string;
  endereco: string;
  telefone_contato: string;
  horario_funcionamento: string;
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
  proprietario: User;
  barbearia: Barbearia;
}


export interface LoginProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export interface RegisterClientProps {
  onRegisterSuccess: (message: string) => void;
}

export interface RegisterBarbershopProps {
  onRegisterSuccess: (token: string, data: RegisterBarbershopResponse) => void;
}

export interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export interface LayoutProps {
  children: React.ReactNode;
}


export type Screen = 'login' | 'register-client' | 'register-barbershop' | 'dashboard';


export interface FormErrors {
  [key: string]: string;
}

export interface FormState {
  isLoading: boolean;
  error: string;
  success: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}


export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'textarea';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
  className?: string;
}


export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}


export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export interface BookingForm {
  // Selected services in the form (we derive the string payload from this)
  service: string[];
  date: string;
  time: string;
  // Selected barber id during creation flow (required in POST)
  barber_id: number | '';
  notes: string;
}

// API contracts for bookings
export interface BookingRequest {
  id_barbearia: number;
  // Accept string (legacy) or array of names (preferred)
  service: string | string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  barber_id: number; // required
  notes?: string;
}

export type BookingStatus = 'pendente' | 'confirmado' | 'cancelado' | 'finalizado';

export interface BookingResponse {
  id: number;
  id_barbearia?: number;
  service: string;
  // Optional detailed services array (present on create response)
  services?: Array<{ service_id: number; name: string; price?: number | null }>; 
  date: string; // ISO string or YYYY-MM-DD
  time: string; // HH:mm or ISO time component
  barber_id?: number;
  // New contract: nested barber object
  barbeiro?: {
    id_barbeiro: number;
    nome: string;
    telefone?: string;
    avatar_url?: string;
  } | null;
  // Optional customer info when visible to barber/proprietário
  cliente?: {
    id_usuario?: number;
    nome?: string;
    email?: string;
    telefone?: string;
    avatar_url?: string;
  } | null;
  notes?: string;
  status: BookingStatus;
  createdAt?: string;
  // Optional related data for convenience
  barbearia?: Barbearia;
  barbearia_nome?: string;
}

// Barbers (barbeiros)
export interface Barbeiro {
  id_barbeiro?: number;
  id_usuario: number;
  nome: string;
  email: string;
  telefone?: string;
  ativo?: boolean;
  especialidades?: string;
  avatar_url?: string; // URL da foto de perfil do barbeiro
}

export interface CreateBarberRequest {
  id_barbearia: number;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  especialidades?: string;
}

// Avaliações (reviews)
export type ReviewTarget = 'barbeiro' | 'barbearia';

export interface CreateReviewRequest {
  id_booking: number;
  target: ReviewTarget;
  rating: number; // 1..5
  comentario?: string; // up to 1000 chars
}

export interface ReviewItem {
  rating: number;
  comentario?: string;
  created_at: string;
  cliente_nome?: string;
}

export interface ReviewsListResponse {
  average: number | null;
  total: number;
  items: ReviewItem[];
}

// Reagendamento com aprovação
export type RescheduleStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface CreateRescheduleRequest {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  barber_id?: number;
}

export interface RescheduleRequestItem {
  id: number;
  booking_id: number;
  target_date: string; // YYYY-MM-DD
  target_time: string; // HH:mm
  target_barber_id?: number;
  status: RescheduleStatus;
  created_at: string;
}

// Serviços da barbearia
export interface ServiceItem {
  id: number;
  id_barbearia: number;
  nome: string;
  preco?: number | string; // apenas visual por enquanto
  ativo?: boolean;
  descricao?: string;
}

export interface CreateServiceRequest {
  nome: string;
  preco?: number | string; // apenas visual por enquanto
  descricao?: string;
}

// Configurações da Barbearia
export interface BusinessHour {
  // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  day: number;
  // Formato HH:mm ou null para fechado
  open: string | null;
  close: string | null;
}

export interface BarbeariaConfig {
  // Duração mínima do serviço em minutos
  duration_minutes: number;
  // Janela de cancelamento em DIAS (null = sem prazo)
  cancel_window_days: number | null;
  // Janela de reagendamento em DIAS (null = sem prazo)
  reschedule_window_days: number | null;
  // Legado opcional, apenas para leitura/fallback
  cancel_window_minutes?: number | null;
  reschedule_window_minutes?: number | null;
  // Horários por dia da semana
  business_hours: BusinessHour[];
}
