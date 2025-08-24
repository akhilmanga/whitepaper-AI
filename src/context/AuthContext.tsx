import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  subscription?: {
    type: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due';
    expiresAt?: string;
  };
  preferences: {
    darkMode: boolean;
    learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
    notifications: {
      email: boolean;
      push: boolean;
      quizReminders: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for stored auth token
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('whitepaperAI_token');
        if (token) {
          // Verify token and get user data
          const userData = await api.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('whitepaperAI_token');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);
  
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { token, user: userData } = await api.login(email, password);
      
      // Store token and user data
      localStorage.setItem('whitepaperAI_token', token);
      setUser(userData);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { token, user: userData } = await api.signup(name, email, password);
      
      // Store token and user data
      localStorage.setItem('whitepaperAI_token', token);
      setUser(userData);
      
      // Redirect to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
    // Clear auth data
    localStorage.removeItem('whitepaperAI_token');
    setUser(null);
    
    // Redirect to home
    navigate('/');
  };
  
  const refreshUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  };
  
  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    if (!user) return;
    
    try {
      const updatedUser = await api.updateUserPreferences(preferences);
      setUser(updatedUser);
      
      // Update local storage if dark mode changed
      if (preferences.darkMode !== undefined) {
        if (preferences.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', preferences.darkMode.toString());
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      updatePreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};