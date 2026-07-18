import React from 'react';

function Sidebar({ username, avatarUrl, onOpenProfile, onLogout }) {
  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="brand-icon">💬</div>
      </div>
      
      <div className="sidebar-bottom">
        <div className="user-widget" onClick={onOpenProfile} id="openProfileBtn" title="Profile Settings">
          <div className="avatar-wrapper" data-username={username}>
            <div 
              className="avatar" 
              id="myWidgetAvatar"
              style={{
                background: avatarUrl ? 'transparent' : getAvatarColor(username)
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" />
              ) : (
                username ? username[0].toUpperCase() : '?'
              )}
            </div>
          </div>
          <div className="user-info">
            <span className="user-name" id="myWidgetName">{username}</span>
            <span className="user-status">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
