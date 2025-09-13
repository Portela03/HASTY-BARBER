
export interface User {
  id_usuario: number;
  nome: string;
  email: string;
  tipo_usuario: string; 
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