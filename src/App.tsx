import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import RegisterClient from './components/RegisterClient';
import RegisterBarbershop from './components/RegisterBarbershop';
import { authService } from './services/api';
import './App.css';

type Screen = 'login' | 'register-client' | 'register-barbershop' | 'dashboard';

interface User {
  id_usuario: number;
  nome: string;
  email: string;
  tipo_usuario: string;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  // Verificar se já existe um token salvo
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken();
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await authService.validateToken();
      if (response.valid && response.usuario) {
        setUser(response.usuario);
        setIsAuthenticated(true);
        setCurrentScreen('dashboard');
      }
  
    } catch (error) {
      localStorage.removeItem('auth_token');
      console.error('Token inválido ou expirado:', error);
    }
  };

  const handleLoginSuccess = (token: string, userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    setMessage(`Bem-vindo, ${userData.nome}!`);
  };

  const handleRegisterSuccess = (msg: string) => {
    setMessage(msg);
    setCurrentScreen('login');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarbershopRegisterSuccess = (data: any) => {
    setUser(data.proprietario);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    setMessage(`Barbearia "${data.barbearia.nome}" cadastrada com sucesso!`);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setCurrentScreen('login');
      setMessage('Logout realizado com sucesso');
    }
  };

  const Dashboard = () => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          <div className="mb-6">
            <p className="text-lg text-gray-700">Olá, {user?.nome}!</p>
            <p className="text-sm text-gray-500">
              Tipo de usuário: {user?.tipo_usuario}
            </p>
            <p className="text-sm text-gray-500">
              Email: {user?.email}
            </p>
          </div>
          
          {user?.tipo_usuario === 'proprietario' && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 text-sm">
                🎉 Sua barbearia foi cadastrada com sucesso! 
                Você pode começar a gerenciar seus serviços e barbeiros.
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {message}
          <button
            onClick={() => setMessage('')}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {currentScreen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setCurrentScreen('register-client')}
        />
      )}

      {currentScreen === 'register-client' && (
        <RegisterClient
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setCurrentScreen('login')}
          onSwitchToBarbershop={() => setCurrentScreen('register-barbershop')}
        />
      )}

      {currentScreen === 'register-barbershop' && (
        <RegisterBarbershop
          onRegisterSuccess={handleBarbershopRegisterSuccess}
          onSwitchToLogin={() => setCurrentScreen('login')}
          onSwitchToClient={() => setCurrentScreen('register-client')}
        />
      )}

      {currentScreen === 'dashboard' && isAuthenticated && <Dashboard />}
    </div>
  );
}

export default App;
