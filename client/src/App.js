import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatLayout from './components/Chat/ChatLayout';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.5rem' }}>
        ⏳ Chargement...
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
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;