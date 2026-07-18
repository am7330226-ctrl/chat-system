import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // Remove React.StrictMode during development if we see double-renders with WebSockets,
  // but it's okay for now.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
