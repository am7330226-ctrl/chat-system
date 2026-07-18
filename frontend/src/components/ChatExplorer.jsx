import React, { useState } from 'react';

function ChatExplorer({
  conversations,
  currentConvId,
  onSelectConversation,
  onNewChat,
  onlineUsers,
  username,
  avatarUrl,
  onOpenProfile,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');

  const COLORS = ['#E8D5FF', '#D5E8FF', '#D5FFE8', '#FFE8D5', '#FFD5D5', '#D5F0FF', '#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const filteredConvs = conversations.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.with?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === 'Unread') return c.unread_count > 0;
    if (filterMode === 'Online') {
      if (c.is_group) return c.members && c.members.some((m) => m !== username && onlineUsers.has(m));
      return c.with && onlineUsers.has(c.with);
    }
    return true;
  });

  return (
    <div className="chat-explorer">
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-title-row">
          <span className="explorer-title">Chats</span>
          <button className="new-chat-btn" onClick={onNewChat} title="New Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
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

      {/* Filter chips */}
      <div className="filter-tags">
        {['All', 'Unread', 'Online'].map((mode) => (
          <button
            key={mode}
            className={`filter-chip ${filterMode === mode ? 'active' : ''}`}
            onClick={() => setFilterMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Chat cards */}
      <div className="chat-list" id="chatList">
        {filteredConvs.length === 0 ? (
          <div className="state-msg">
            <span className="icon">💬</span>
            <p>No conversations yet</p>
            <small>Tap + to start a new chat</small>
          </div>
        ) : (
          filteredConvs.map((conv) => {
            const displayName = conv.is_group ? conv.name : conv.with;
            const displayAvatarUrl = conv.is_group ? null : conv.avatar_url;
            const isOnline = conv.is_group
              ? conv.members?.some((m) => m !== username && onlineUsers.has(m))
              : onlineUsers.has(conv.with);
            const isActive = currentConvId === conv.id;

            return (
              <div
                key={conv.id}
                className={`chat-card ${isActive ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                onClick={() => onSelectConversation(conv)}
              >
                <div className="avatar-wrapper">
                  <div
                    className="avatar"
                    style={{ background: displayAvatarUrl ? 'transparent' : getAvatarColor(displayName) }}
                  >
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                        alt="avatar"
                      />
                    ) : conv.is_group ? (
                      '👥'
                    ) : (
                      displayName ? displayName[0].toUpperCase() : '?'
                    )}
                  </div>
                  <div className={`status-dot ${isOnline ? 'online' : ''}`}></div>
                </div>

                <div className="chat-info">
                  <div className="chat-meta">
                    <span className="chat-name">{displayName}</span>
                    {conv.last_message && (
                      <span className="chat-time">
                        {typeof conv.last_message === 'object' && conv.last_message.timestamp && !isNaN(new Date(conv.last_message.timestamp).getTime())
                          ? new Date(conv.last_message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : (typeof conv.last_message === 'object' ? (conv.last_message.timestamp || '') : conv.last_timestamp || '')}
                      </span>
                    )}
                  </div>
                  <div className="chat-preview">
                    <span className="chat-preview-text">
                      {conv.last_message
                        ? typeof conv.last_message === 'string'
                          ? conv.last_message
                          : conv.last_message.is_deleted
                          ? '🚫 Message deleted'
                          : conv.last_message.file_url
                          ? '📎 Attachment'
                          : conv.last_message.text
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

      {/* User widget at footer */}
      <div className="user-widget" id="userWidgetCard" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
        <div className="user-widget-profile">
          <div className="avatar-wrapper">
            <div
              className="avatar"
              id="myWidgetAvatar"
              style={{ background: avatarUrl ? 'transparent' : getAvatarColor(username) }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                  alt="avatar"
                />
              ) : username ? (
                username[0].toUpperCase()
              ) : (
                '?'
              )}
            </div>
            <span className="status-dot online"></span>
          </div>
          <div className="user-widget-info">
            <span className="user-widget-name" id="myWidgetName">
              {username}
            </span>
            <span className="user-widget-role">Active &amp; Chatting</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatExplorer;
