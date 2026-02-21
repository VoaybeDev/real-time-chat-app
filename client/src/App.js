import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/UI/Toast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatLayout from './components/Chat/ChatLayout';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo gradient-text">💬 ChatApp</div>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister
      ? <Register onSwitch={() => setShowRegister(false)} />
      : <Login    onSwitch={() => setShowRegister(true)}  />;
  }

  return (
    <SocketProvider>
      <ChatLayout />
    </SocketProvider>
  );
};

const App = () => (
  <ToastProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ToastProvider>
);

export default App;