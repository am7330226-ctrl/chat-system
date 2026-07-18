import React, { useState } from 'react';

function ChatExplorer({ 
  conversations, 
  currentConvId, 
  onSelectConversation, 
  onNewChat,
  onlineUsers,
  username,
  avatarUrl
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');

  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const filteredConvs = conversations.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.with?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === 'Unread') {
      return c.unread_count > 0;
    } else if (filterMode === 'Online') {
      if (c.is_group) {
        return c.members && c.members.some(m => m !== username && onlineUsers.has(m));
      }
      return c.with && onlineUsers.has(c.with);
    }
    return true;
  });

  return (
    <section className="chat-explorer" aria-label="Chat Explorer">
      <div className="explorer-header">
        <div className="explorer-title-row">
          <h1 className="explorer-title">Chats</h1>
          <button className="new-chat-btn" onClick={onNewChat} title="New Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            className="search-input"
            placeholder="Search chats, threads..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-tags">
        {['All', 'Unread', 'Online'].map(mode => (
          <button 
            key={mode}
            className={`filter-chip ${filterMode === mode ? 'active' : ''}`}
            onClick={() => setFilterMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="chat-list" id="chatList">
        {filteredConvs.length === 0 ? (
          <div className="state-msg">
            <span className="icon">⏳</span>
            <p>No messages found</p>
          </div>
        ) : (
          filteredConvs.map(conv => {
            const displayName = conv.is_group ? conv.name : conv.with;
            const displayAvatarUrl = conv.is_group ? null : conv.avatar_url;
            const isOnline = conv.is_group 
              ? conv.members?.some(m => m !== username && onlineUsers.has(m))
              : onlineUsers.has(conv.with);

            const isActive = currentConvId === conv.id;
            
            return (
              <div 
                key={conv.id}
                className={`chat-card ${isActive ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                onClick={() => onSelectConversation(conv)}
              >
                <div className="avatar-wrapper" data-username={conv.is_group ? '' : conv.with}>
                  <div 
                    className="avatar" 
                    style={{ background: displayAvatarUrl ? 'transparent' : getAvatarColor(displayName) }}
                  >
                    {displayAvatarUrl ? (
                      <img src={displayAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" />
                    ) : (
                      conv.is_group ? '👥' : (displayName ? displayName[0].toUpperCase() : '?')
                    )}
                  </div>
                  <div className={`status-dot ${isOnline ? 'online' : ''}`}></div>
                </div>
                
                <div className="chat-info">
                  <div className="chat-name-row">
                    <span className="chat-name">{displayName}</span>
                    {conv.last_message && (
                      <span className="chat-time">
                        {new Date(conv.last_message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                  <div className="chat-preview-row">
                    <span className="chat-preview">
                      {conv.last_message 
                        ? (conv.last_message.is_deleted ? '🚫 This message was deleted' : (conv.last_message.file_url ? '📎 Attachment' : conv.last_message.text))
                        : 'No messages yet'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="user-widget" id="userWidgetCard">
        <div className="user-widget-profile">
          <div className="avatar-wrapper">
            <div 
              className="avatar" 
              id="myWidgetAvatar"
              style={{ background: avatarUrl ? 'transparent' : getAvatarColor(username) }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" />
              ) : (
                username ? username[0].toUpperCase() : '?'
              )}
            </div>
            <span className="status-dot online"></span>
          </div>
          <div className="user-widget-info">
            <span className="user-widget-name" id="myWidgetName">{username}</span>
            <span className="user-widget-role">Active & Chatting</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ChatExplorer;
