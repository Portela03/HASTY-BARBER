export interface User {
  id_usuario: number;
  nome: string;
  email: string;
  tipo_usuario: string; 
  avatar_url?: string;
}


export interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
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
  
  service: string[];
  date: string;
  time: string;
  barber_id: number | '';
  notes: string;
}


export interface BookingRequest {
  id_barbearia: number;
  service: string | string[];
  date: string;
  time: string;
  barber_id: number;
  notes?: string;
}

export type BookingStatus = 'pendente' | 'confirmado' | 'cancelado' | 'finalizado';

export interface BookingResponse {
  id: number;
  id_barbearia?: number;
  service: string;
  services?: Array<{ service_id: number; name: string; price?: number | null }>;
  date: string;
  time: string;
  barber_id?: number;
  barbeiro?: {
    id_barbeiro: number;
    nome: string;
    telefone?: string;
    avatar_url?: string;
  } | null;

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
 
  barbearia?: Barbearia;
  barbearia_nome?: string;
}


export interface Barbeiro {
  id_barbeiro?: number;
  id_usuario: number;
  nome: string;
  email: string;
  telefone?: string;
  ativo?: boolean;
  especialidades?: string;
  avatar_url?: string;
}

export interface CreateBarberRequest {
  id_barbearia: number;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  especialidades?: string;
}


export type ReviewTarget = 'barbeiro' | 'barbearia';

export interface CreateReviewRequest {
  id_booking: number;
  target: ReviewTarget;
  rating: number;
  comentario?: string;
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


export type RescheduleStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface CreateRescheduleRequest {
  date: string;
  time: string;
  barber_id?: number;
}

export interface RescheduleRequestItem {
  id: number;
  booking_id: number;
  target_date: string;
  target_time: string;
  target_barber_id?: number;
  status: RescheduleStatus;
  created_at: string;
}


export interface ServiceItem {
  id: number;
  id_barbearia: number;
  nome: string;
  preco?: number | string;
  ativo?: boolean;
  descricao?: string;
}

export interface CreateServiceRequest {
  nome: string;
  preco?: number | string;
  descricao?: string;
}


export interface BusinessHour {
  day: number;
  open: string | null;
  close: string | null;
}

export interface BarbeariaConfig {
  duration_minutes: number;
  cancel_window_days: number | null;
  reschedule_window_days: number | null;
  cancel_window_minutes?: number | null;
  reschedule_window_minutes?: number | null;
  business_hours: BusinessHour[];
}
