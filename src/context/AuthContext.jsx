import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('medisched_token'));
  const [loading, setLoading] = useState(true);

  // Load user session on mount if token exists
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('medisched_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (data.token && data.user) {
      localStorage.setItem('medisched_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Invalid login response from server.');
  };

  const registerPatient = async (userData) => {
    const data = await api.registerPatient(userData);
    if (data.token && data.user) {
      localStorage.setItem('medisched_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Registration failed.');
  };

  const registerClinic = async (clinicData) => {
    const data = await api.registerClinic(clinicData);
    if (data.token && data.user) {
      localStorage.setItem('medisched_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Clinic registration failed.');
  };

  const logout = () => {
    localStorage.removeItem('medisched_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerPatient,
        registerClinic,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
