import React, { useState, useEffect, useRef } from 'react';

function ChatWorkspace({ 
  activeConv, 
  messages, 
  username, 
  onlineUsers, 
  onSendMessage, 
  onTyping,
  typingUsers, // array or set of users typing
  onEditMessage,
  onDeleteMessage,
  onAddReaction
}) {
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);

  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onTyping(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [inputText]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onTyping(true);
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
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          fileUrl = data.file_url;
          fileType = data.file_type;
        }
      } catch (err) {
        console.error("Upload failed", err);
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
    onTyping(false);
  };

  if (!activeConv) {
    return (
      <div className="chat-workspace">
        <div className="empty-workspace-state">
          <div className="empty-icon">💬</div>
          <h3>Your Space</h3>
          <p>Select a chat or start a new conversation.</p>
        </div>
      </div>
    );
  }

  const displayName = activeConv.is_group ? activeConv.name : activeConv.with;
  const displayAvatarUrl = activeConv.is_group ? null : activeConv.avatar_url;
  const isOnline = activeConv.is_group 
    ? activeConv.members?.some(m => m !== username && onlineUsers.has(m))
    : onlineUsers.has(activeConv.with);

  return (
    <div className="chat-workspace active">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="avatar-wrapper">
            <div className="avatar" style={{ background: displayAvatarUrl ? 'transparent' : getAvatarColor(displayName) }}>
              {displayAvatarUrl ? (
                <img src={displayAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" />
              ) : (
                activeConv.is_group ? '👥' : (displayName ? displayName[0].toUpperCase() : '?')
              )}
            </div>
            <div className={`status-dot ${isOnline ? 'online' : ''}`}></div>
          </div>
          <div>
            <div className="chat-name">{displayName}</div>
            <div className="chat-status-text">
              {activeConv.is_group 
                ? `${activeConv.members?.length || 0} members` 
                : (isOnline ? 'Online' : 'Offline')}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-box">
        {messages.map((msg, idx) => {
          const isMe = msg.username === username;
          return (
            <div key={msg.id || idx} className={`msg-row ${isMe ? 'me' : 'other'} ${msg.is_deleted ? 'deleted-message' : ''}`}>
              {!isMe && (
                <div className="msg-meta">{msg.username}</div>
              )}
              <div className="msg-bubble-wrapper">
                <div className={`msg-bubble ${msg.is_deleted ? 'deleted' : ''}`}>
                  {msg.is_deleted ? (
                    '🚫 This message was deleted'
                  ) : (
                    <>
                      {msg.file_url && (
                        <div style={{ marginBottom: '8px' }}>
                          {msg.file_type === 'image' && <img src={msg.file_url} style={{ maxWidth: '200px', borderRadius: '8px' }} alt="attachment" />}
                          {msg.file_type === 'audio' && <audio src={msg.file_url} controls style={{ maxWidth: '200px' }} />}
                          {msg.file_type === 'file' && <a href={msg.file_url} target="_blank" rel="noreferrer">📎 Download File</a>}
                        </div>
                      )}
                      {msg.text}
                      {msg.is_edited && <span className="edited-tag"> (edited)</span>}
                    </>
                  )}
                  <div className="msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {isMe && !msg.is_deleted && (
                      <span className={`read-receipt ${msg.read ? 'read' : 'unread'}`} style={{ color: msg.read ? '#007aff' : 'var(--text-muted)' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6L8.5 14.5L5 11" /><path d="M22 6L13.5 14.5" /></svg>
                      </span>
                    )}
                  </div>
                </div>

                {!msg.is_deleted && (
                  <div className="msg-actions">
                    <button onClick={() => onAddReaction(msg.id, '👍')}>👍</button>
                    <button onClick={() => onAddReaction(msg.id, '❤️')}>❤️</button>
                    <button onClick={() => onAddReaction(msg.id, '😂')}>😂</button>
                    {isMe && (
                      <>
                        <button onClick={() => {setEditingMsgId(msg.id); setInputText(msg.text);}}>✏️</button>
                        <button onClick={() => onDeleteMessage(msg.id)}>🗑️</button>
                      </>
                    )}
                  </div>
                )}
                
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="rx-container">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span key={emoji} className="rx-capsule" onClick={() => onAddReaction(msg.id, emoji)} title={users.join(', ')}>
                        {emoji} <span className="rx-count">{users.length}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {typingUsers && typingUsers.length > 0 && (
          <div className="typing-indicator-container visible">
            <div className="typing-bubble">
              <span></span><span></span><span></span>
            </div>
            <div className="typing-text">{typingUsers.join(', ')} is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-composer">
        {editingMsgId && (
          <div style={{ padding: '0 20px', color: 'var(--primary)', fontSize: '12px' }}>
            Editing message... <span style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={() => {setEditingMsgId(null); setInputText('');}}>Cancel</span>
          </div>
        )}
        {file && (
          <div style={{ padding: '0 20px', fontSize: '12px' }}>
            Attached: {file.name} <span style={{cursor: 'pointer', color: 'red'}} onClick={() => setFile(null)}>✖</span>
          </div>
        )}
        <form className="chat-input-area" onSubmit={handleSubmit}>
          <button type="button" className="attach-btn" onClick={() => document.getElementById('fileUploadInput').click()}>+</button>
          <input type="file" id="fileUploadInput" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
          
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={inputText}
            onChange={handleInputChange}
          />
          <button type="submit" className="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWorkspace;
