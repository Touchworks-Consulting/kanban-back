import React, { useState } from 'react';
import StatusSettings from './components/settings/StatusSettings';
import './App.css';

function App() {
  // For demo purposes - in real app, this would come from auth context
  const [token] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJlNzI5ZDNlLTY5ZmYtNGU4MS04ODgwLTE5N2IzYTYxMTg3OCIsImVtYWlsIjoidGVzdGVAZXhhbXBsZS5jb20iLCJpYXQiOjE3MjYyNzM1MDIsImV4cCI6MTc1Nzg5NTkwMn0.8QYhBhNJqXhJcvqDXXJ0TpxHUQzm9Uj5U4gzAfFdGa0');
  const [accountId] = useState('2e729d3e-69ff-4e81-8880-197b3a611878');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="App">
      {!showSettings ? (
        <header className="App-header" style={{ backgroundColor: '#f8fafc', color: '#1f2937', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
              Kanban Touch CRM
            </h1>
            <p style={{ fontSize: '18px', marginBottom: '32px', color: '#6b7280' }}>
              Sistema de gestão de leads com status customizáveis
            </p>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Configurar Status
            </button>
            <div style={{ marginTop: '40px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '16px' }}>Funcionalidades</h3>
              <ul style={{ textAlign: 'left', color: '#4b5563' }}>
                <li>✅ Status customizáveis por conta</li>
                <li>✅ Motivos de perda personalizados</li>
                <li>✅ Interface drag-and-drop para reordenar</li>
                <li>✅ Validação de dados em tempo real</li>
                <li>✅ API REST completa</li>
              </ul>
            </div>
          </div>
        </header>
      ) : (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Voltar
            </button>
          </div>
          <StatusSettings accountId={accountId} token={token} />
        </div>
      )}
    </div>
  );
}

export default App;
