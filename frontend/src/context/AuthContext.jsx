import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { user, token } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success(`Welcome back, ${user.full_name}!`);
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.signup(data);
      const { user, token } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Account created successfully!');
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Signup failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
