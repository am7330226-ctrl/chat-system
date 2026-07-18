import React, { useState } from 'react';

function ChatExplorer({ 
  conversations, 
  currentConvId, 
  onSelectConversation, 
  onNewChat,
  onlineUsers,
  username
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');

  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const filteredConvs = conversations.filter(c => {
    // 1. Search filter
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.with?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Chip filter
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
    <div className="chat-explorer">
      <div className="explorer-header">
        <h2>Messages</h2>
        <button className="new-chat-btn" onClick={onNewChat} title="New Chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div className="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          placeholder="Search chats..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-chips">
        {['All', 'Unread', 'Online'].map(mode => (
          <button 
            key={mode}
            className={`chip ${filterMode === mode ? 'active' : ''}`}
            onClick={() => setFilterMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="chat-list" id="chatList">
        {filteredConvs.length === 0 ? (
          <div className="state-msg">
            <span className="icon">💬</span>
            <p>No messages found</p>
            <small>Change filters or search for another user</small>
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
    </div>
  );
}

export default ChatExplorer;
