import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const existingUser = localStorage.getItem('chat_username');
    const existingToken = localStorage.getItem('chat_token');
    if (existingUser && existingToken) {
      navigate('/inbox');
    }
  }, [navigate]);

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert({ message: '', type: '' });
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Login successful! Redirecting...', 'success');
        localStorage.setItem('chat_username', data.username);
        localStorage.setItem('chat_token', data.token);
        setTimeout(() => {
          navigate('/inbox');
        }, 1000);
      } else {
        showAlert(`Login Failed: ${data.message}`, 'error');
      }
    } catch (error) {
      showAlert('Network error. Is the server running?', 'warning');
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-container">
        <div className="auth-header">
          <h1>💬 ChatSphere</h1>
          <p>Welcome back! Please log in.</p>
        </div>

        {alert.message && (
          <div className={`alert ${alert.type}`}>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginUsername">Username</label>
            <input
              type="text"
              id="loginUsername"
              required
              placeholder="Enter username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="loginPassword">Password</label>
            <input
              type="password"
              id="loginPassword"
              required
              placeholder="Enter password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Log In</button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
