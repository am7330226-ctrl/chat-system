import React from 'react';

function Sidebar({ onOpenProfile }) {
  return (
    <aside className="sidebar-rail" aria-label="Workspaces">
      <div className="workspace-list">
        <div className="logo-item" title="ChatSphere Home">💬</div>
        <button className="workspace-btn active" title="Personal Chats">🏠</button>
      </div>
      
      <div className="rail-footer">
        <button className="settings-btn" id="themeToggleBtn" title="Toggle Theme" aria-label="Toggle Theme" style={{marginBottom: '12px', fontSize: '18px'}}>🌙</button>
        <button className="settings-btn" onClick={onOpenProfile} title="Profile" aria-label="Profile">👤</button>
      </div>
    </aside>
  );
}

export default Sidebar;
