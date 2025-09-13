import { useContext } from 'react';
import type { AuthContextType } from '../types';
import AuthContext from '../contexts/AuthContext';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};