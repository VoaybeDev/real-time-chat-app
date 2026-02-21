import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

axios.defaults.baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
axios.defaults.headers.common['Accept'] = 'application/json';
export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const { data } = await axios.get('/api/auth/me');
          setUser(data.user);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (userData, userToken) => {
    setToken(userToken);
    setUser(userData);
    localStorage.setItem('token', userToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);