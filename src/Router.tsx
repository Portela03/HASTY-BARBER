import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RegisterClient from './components/RegisterClient';
import RegisterBarbershop from './components/RegisterBarbershop';
import Dashboard from './components/Dashboard';
import RegisterBarber from './components/RegisterBarber';
import RegisterService from './components/RegisterService';
import BarbershopBookings from './components/BarbershopBookings';
import BarberBookings from './components/BarberBookings';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import BarbershopConfig from './components/BarbershopConfig';
import BookingService from './components/BookingService';
import MyAppointments from './components/MyAppointments';
import AppointmentHistory from './components/AppointmentHistory';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

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
            path="/forgot-password" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} 
          />
          <Route 
            path="/reset-password" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />} 
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
            path="/barbearias/:id/config"
            element={
              isAuthenticated
                ? (user?.tipo_usuario === 'proprietario' ? <BarbershopConfig /> : <Navigate to="/dashboard" replace />)
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/barbearias/:id/register-barber"
            element={
              isAuthenticated
                ? (user?.tipo_usuario === 'proprietario' ? <RegisterBarber /> : <Navigate to="/dashboard" replace />)
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/barbearias/:id/register-service"
            element={
              isAuthenticated
                ? (user?.tipo_usuario === 'proprietario' ? <RegisterService /> : <Navigate to="/dashboard" replace />)
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/barbearias/:id/bookings"
            element={
              isAuthenticated
                ? (user?.tipo_usuario === 'proprietario' ? <BarbershopBookings /> : <Navigate to="/dashboard" replace />)
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/barbeiros/:id/bookings"
            element={
              isAuthenticated
                ? (user?.tipo_usuario === 'barbeiro' ? <BarberBookings /> : <Navigate to="/dashboard" replace />)
                : <Navigate to="/login" replace />
            }
          />
          {/* Route for schedule removed (DefineSchedule component deleted) */}
          
 
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />

          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
          />

          <Route 
            path="/booking" 
            element={isAuthenticated ? <BookingService /> : <Navigate to="/login" replace />}
          />

          <Route 
            path="/my-appointments" 
            element={isAuthenticated ? <MyAppointments /> : <Navigate to="/login" replace />}
          />

          <Route 
            path="/appointment-history" 
            element={isAuthenticated ? <AppointmentHistory /> : <Navigate to="/login" replace />}
          />


        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default AppRouter;