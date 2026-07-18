import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Inbox from './Inbox';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/inbox" element={<Inbox />} />
        
        {/* Legacy route redirects */}
        <Route path="/login.html" element={<Navigate to="/login" replace />} />
        <Route path="/register.html" element={<Navigate to="/register" replace />} />
        <Route path="/inbox.html" element={<Navigate to="/inbox" replace />} />
        
        {/* Catch-all to prevent blank screens */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
