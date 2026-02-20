import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';

// Connexion au serveur Socket.io
const socket = socketIOClient('http://localhost:4000');

const App = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // Recevoir les messages du serveur en temps réel
  useEffect(() => {
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off('chat message');
    };
  }, []);

  // Envoyer un message au serveur
  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chat message', message);
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      <h1>Chat en Temps Réel</h1>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            {msg}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tapez un message"
      />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
};

export default App;