import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RegisterClient from './components/RegisterClient';
import RegisterBarbershop from './components/RegisterBarbershop';
import Dashboard from './components/Dashboard';

import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>

          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/register/client" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterClient />} 
          />
          <Route 
            path="/register/barbershop" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterBarbershop />} 
          />
          

          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          
 
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />

          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default AppRouter;