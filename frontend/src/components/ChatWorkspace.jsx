import React, { useState, useEffect, useRef } from 'react';

function ChatWorkspace({
  activeConv,
  messages,
  username,
  onlineUsers,
  onSendMessage,
  onTyping,
  typingUsers,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
}) {
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const COLORS = ['#E8D5FF', '#D5E8FF', '#D5FFE8', '#FFE8D5', '#FFD5D5', '#D5F0FF', '#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing debounce
  useEffect(() => {
    const timer = setTimeout(() => onTyping && onTyping(false), 2000);
    return () => clearTimeout(timer);
  }, [inputText]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onTyping && onTyping(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !file) return;

    let fileUrl = null;
    let fileType = null;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const token = localStorage.getItem('chat_token');
        const res = await fetch('/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          fileUrl = data.file_url;
          fileType = data.file_type;
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    }

    if (editingMsgId) {
      onEditMessage(editingMsgId, inputText);
      setEditingMsgId(null);
    } else {
      onSendMessage(inputText, fileUrl, fileType);
    }

    setInputText('');
    setFile(null);
    onTyping && onTyping(false);
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!activeConv) {
    return (
      <div className="chat-workspace">
        <div id="emptyWorkspaceState">
          <span className="icon">💬</span>
          <h2>Select a Conversation</h2>
          <p>Choose an existing thread from the list, or tap + to start a new chat!</p>
        </div>
      </div>
    );
  }

  // ── Active conversation ────────────────────────────────────────────────────
  const displayName = activeConv.is_group ? activeConv.name : activeConv.with;
  const displayAvatarUrl = activeConv.is_group ? null : activeConv.avatar_url;
  const isOnline = activeConv.is_group
    ? activeConv.members?.some((m) => m !== username && onlineUsers.has(m))
    : onlineUsers.has(activeConv.with);

  return (
    <div className="chat-workspace">
      {/* ── Chat Header ── */}
      <div className="chat-header">
        <div className="active-user-details">
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
              ) : activeConv.is_group ? (
                '👥'
              ) : displayName ? (
                displayName[0].toUpperCase()
              ) : (
                '?'
              )}
            </div>
            <div className={`status-dot ${isOnline ? 'online' : ''}`}></div>
          </div>
          <div className="active-user-info">
            <span className="active-user-name">{displayName}</span>
            <span className="active-user-status">
              {activeConv.is_group
                ? `${activeConv.members?.length || 0} members`
                : isOnline
                ? 'Online'
                : 'Offline'}
            </span>
          </div>
        </div>

        <div className="header-action-list">
          <button className="header-icon-btn" title="Voice call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
          <button className="header-icon-btn" title="Video call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button className="header-icon-btn" title="More options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages Thread ── */}
      <div className="message-thread" id="chatBox">
        {messages.map((msg, idx) => {
          const isMe = msg.username === username;
          return (
            <div
              key={msg.id || idx}
              className={`msg-row ${isMe ? 'me' : 'other'} ${msg.is_deleted ? 'deleted-message' : ''}`}
            >
              {!isMe && <div className="msg-meta">{msg.username}</div>}

              <div className="msg-bubble-wrapper" style={{ position: 'relative' }}>
                <div className={`msg-bubble ${msg.is_deleted ? 'deleted' : ''}`}>
                  {msg.is_deleted ? (
                    <span style={{ opacity: 0.6, fontStyle: 'italic' }}>🚫 This message was deleted</span>
                  ) : (
                    <>
                      {msg.file_url && (
                        <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                          {msg.file_type === 'image' && (
                            <img src={msg.file_url} className="msg-image" alt="attachment" />
                          )}
                          {msg.file_type === 'audio' && (
                            <audio src={msg.file_url} controls style={{ maxWidth: '220px' }} />
                          )}
                          {msg.file_type === 'file' && (
                            <a href={msg.file_url} target="_blank" rel="noreferrer" className="msg-file">
                              <span className="msg-file-icon">📎</span>
                              <div>
                                <div className="msg-file-name">Download File</div>
                                <div className="msg-file-label">Attachment</div>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                      {msg.text}
                      {msg.is_edited && (
                        <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '6px' }}>(edited)</span>
                      )}
                    </>
                  )}

                  <div className="msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && !msg.is_deleted && (
                      <span style={{ marginLeft: '4px', color: msg.read ? '#4f46e5' : 'var(--text-muted)' }}>
                        {msg.read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reaction & action buttons */}
                {!msg.is_deleted && (
                  <div className="msg-actions-menu" style={{
                    position: 'absolute',
                    top: '-20px',
                    [isMe ? 'right' : 'left']: '0',
                    display: 'none',
                    gap: '4px',
                    background: 'white',
                    borderRadius: '20px',
                    padding: '4px 8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10,
                  }}>
                    <button onClick={() => onAddReaction(msg.id, '👍')}>👍</button>
                    <button onClick={() => onAddReaction(msg.id, '❤️')}>❤️</button>
                    <button onClick={() => onAddReaction(msg.id, '😂')}>😂</button>
                    {isMe && (
                      <>
                        <button onClick={() => { setEditingMsgId(msg.id); setInputText(msg.text); }}>✏️</button>
                        <button onClick={() => onDeleteMessage(msg.id)}>🗑️</button>
                      </>
                    )}
                  </div>
                )}

                {/* Reactions display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="rx-container" style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span
                        key={emoji}
                        className="rx-capsule"
                        onClick={() => onAddReaction(msg.id, emoji)}
                        title={users.join(', ')}
                        style={{
                          background: 'white',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '20px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        {emoji} <span style={{ fontSize: '11px', fontWeight: 600 }}>{users.length}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="typing-indicator-container visible">
            <div className="typing-indicator-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <div className="typing-text">{typingUsers.join(', ')} is typing...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer ── */}
      <div className="composer-area">
        {editingMsgId && (
          <div style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '8px', paddingLeft: '4px' }}>
            ✏️ Editing message —{' '}
            <span
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setEditingMsgId(null); setInputText(''); }}
            >
              Cancel
            </span>
          </div>
        )}
        {file && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
            📎 {file.name}{' '}
            <span style={{ cursor: 'pointer', color: 'red' }} onClick={() => setFile(null)}>✖</span>
          </div>
        )}
        <div className="composer-box">
          <div className="composer-input-row">
            <button
              type="button"
              className="composer-btn"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />

            <textarea
              className="composer-textarea"
              placeholder="Type a message…"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <div className="composer-btn-group">
              <button
                type="button"
                className="composer-btn composer-send-btn"
                title="Send"
                onClick={handleSubmit}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWorkspace;
