import React from 'react';

function Sidebar({ onOpenProfile }) {
  return (
    <div className="sidebar-rail">
      <div className="workspace-list">
        <div className="logo-item" title="ChatSphere">💬</div>
        <button className="workspace-btn active" title="Chats">🏠</button>
      </div>
      <div className="rail-footer">
        <button
          className="settings-btn"
          onClick={onOpenProfile}
          title="Profile &amp; Settings"
        >
          👤
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
