import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';

function Register() {
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
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        showAlert(`Registration Failed: ${data.message}`, 'error');
      }
    } catch (error) {
      showAlert('Network error. Is the server running?', 'warning');
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-container">
        <div className="auth-header">
          <h1>✨ Join ChatSphere</h1>
          <p>Create an account to start chatting.</p>
        </div>

        {alert.message && (
          <div className={`alert ${alert.type}`}>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="regUsername">Choose Username</label>
            <input
              type="text"
              id="regUsername"
              required
              placeholder="e.g. cool_user99"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="regPassword">Create Password</label>
            <input
              type="password"
              id="regPassword"
              required
              placeholder="Must be at least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Create Account</button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
