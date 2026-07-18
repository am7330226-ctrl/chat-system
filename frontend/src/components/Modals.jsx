import React, { useState, useEffect } from 'react';

export function ProfileModal({ isOpen, onClose, username, onLogout, onProfileUpdate }) {
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saveText, setSaveText] = useState('Save Bio');

  useEffect(() => {
    if (isOpen) {
      // Fetch profile data when opened
      fetch(`/api/user/${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.bio) setBio(data.bio);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        })
        .catch(console.error);
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const handleAvatarUpload = async (e) => {
    if (e.target.files.length > 0) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      try {
        const token = localStorage.getItem('chat_token');
        const res = await fetch('/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.file_url) {
          setAvatarUrl(data.file_url);
          onProfileUpdate({ avatar_url: data.file_url });
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
      }
    }
  };

  const handleSaveBio = () => {
    onProfileUpdate({ bio });
    setSaveText('Saved!');
    setTimeout(() => setSaveText('Save Bio'), 2000);
  };

  return (
    <div className="overlay open" onClick={(e) => { if (e.target.className.includes('overlay')) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>Profile Settings</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="profile-edit-section">
          <div 
            className="avatar-large" 
            onClick={() => document.getElementById('avatarUploadInput').click()}
            style={{ background: avatarUrl ? 'transparent' : getAvatarColor(username) }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" />
            ) : (
              username ? username[0].toUpperCase() : '?'
            )}
            <div className="avatar-edit-overlay">
              <span>✏️</span>
            </div>
          </div>
          <input type="file" id="avatarUploadInput" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
          
          <h2 id="profileUsername">{username}</h2>
          
          <div className="input-group">
            <label>Bio</label>
            <input 
              type="text" 
              placeholder="Write a short bio..." 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          
          <button className="btn-primary" style={{width: '100%'}} onClick={handleSaveBio}>{saveText}</button>
          <div className="divider"></div>
          <button className="btn-danger" style={{width: '100%'}} onClick={onLogout}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

export function NewChatModal({ isOpen, onClose, allUsers, onStartChat, username, onCreateGroup }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());

  if (!isOpen) return null;

  const COLORS = ['#E8D5FF','#D5E8FF','#D5FFE8','#FFE8D5','#FFD5D5','#D5F0FF','#FFF5D5'];
  const getAvatarColor = (name) => {
    if (!name) return COLORS[0];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  };

  const otherUsers = Array.isArray(allUsers) ? allUsers.filter(u => u.username !== username) : [];
  const filteredUsers = otherUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleUserClick = (u) => {
    if (isGroupMode) {
      const newSet = new Set(selectedMembers);
      if (newSet.has(u.username)) newSet.delete(u.username);
      else newSet.add(u.username);
      setSelectedMembers(newSet);
    } else {
      onStartChat(u.username);
    }
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedMembers.size > 0) {
      onCreateGroup(groupName, Array.from(selectedMembers));
    }
  };

  return (
    <div className="overlay open" onClick={(e) => { if (e.target.className.includes('overlay')) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isGroupMode ? 'Create Group Chat' : 'New Chat'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-tabs">
          <button className={`tab-btn ${!isGroupMode ? 'active' : ''}`} onClick={() => {setIsGroupMode(false); setSelectedMembers(new Set());}}>Direct Message</button>
          <button className={`tab-btn ${isGroupMode ? 'active' : ''}`} onClick={() => setIsGroupMode(true)}>Group Chat</button>
        </div>

        {isGroupMode && (
          <div className="input-group" style={{marginBottom: '16px'}}>
            <label>Group Name</label>
            <input type="text" placeholder="e.g. Project Team" value={groupName} onChange={e => setGroupName(e.target.value)} />
          </div>
        )}

        <div className="search-bar" style={{ margin: '0 0 16px 0' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="user-list">
          {filteredUsers.length === 0 ? (
            <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px'}}>No users found</div>
          ) : (
            filteredUsers.map(u => (
              <div 
                key={u.username}
                className="user-item"
                onClick={() => handleUserClick(u)}
                style={{ backgroundColor: selectedMembers.has(u.username) ? 'var(--bg-hover)' : '' }}
              >
                <div className="avatar-wrapper">
                  <div className="avatar" style={{ background: u.avatar_url ? 'transparent' : getAvatarColor(u.username) }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="avatar" /> : u.username[0].toUpperCase()}
                  </div>
                </div>
                <div className="user-info">
                  <span className="user-name">{u.username}</span>
                  {u.bio && <span className="user-bio">{u.bio}</span>}
                </div>
                {isGroupMode && (
                  <div className="checkbox" style={{
                    width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
                    background: selectedMembers.has(u.username) ? 'var(--primary)' : 'transparent'
                  }}>
                    {selectedMembers.has(u.username) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {isGroupMode && (
          <button 
            className="btn-primary" 
            style={{width: '100%', marginTop: '16px'}}
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.size === 0}
          >
            Create Group
          </button>
        )}
      </div>
    </div>
  );
}
