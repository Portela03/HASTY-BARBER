import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { authService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const validateToken = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authService.validateToken();
      if (response.valid && response.usuario) {
        
        const raw = response.usuario as any;
        const normalized: User = {
          id_usuario: raw.id_usuario,
          nome: raw.nome,
          email: raw.email,
          tipo_usuario: raw.tipo_usuario,
          avatar_url: raw.avatar_url ?? raw.foto_perfil ?? raw.avatar,
        };
        setUser(normalized);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token inválido ou expirado:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, [token, validateToken]);

  const login = (newToken: string, userData: User): void => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = (): void => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;