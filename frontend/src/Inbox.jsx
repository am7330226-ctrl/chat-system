import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatExplorer from './components/ChatExplorer';
import ChatWorkspace from './components/ChatWorkspace';
import { ProfileModal, NewChatModal } from './components/Modals';

function Inbox() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isNewChatModalOpen, setNewChatModalOpen] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('chat_username');
    const tok = localStorage.getItem('chat_token');
    
    if (!user || !tok) {
      navigate('/login');
      return;
    }
    
    setUsername(user);
    setToken(tok);
    
    // Fetch my profile
    fetch(`/api/user/${user}`)
      .then(res => res.json())
      .then(data => setAvatarUrl(data.avatar_url))
      .catch(console.error);

    fetchUsers();
    loadConversations(tok);

    // Setup Socket
    const socket = io(); // URL is proxy'd by vite
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register_presence', { token: tok });
    });

    socket.on('online_user_list', (data) => {
      setOnlineUsers(new Set(data.online_users));
    });

    socket.on('status_change', (data) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.status === 'online') next.add(data.username);
        else next.delete(data.username);
        return next;
      });
    });

    socket.on('new_message_notification', () => {
      // Reload conversations to update last message and unread count
      loadConversations(tok);
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  // Load active conversation messages when it changes
  useEffect(() => {
    if (activeConv && token && socketRef.current) {
      fetch(`/api/messages/${activeConv.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        socketRef.current.emit('join_conversation', { token, conversation_id: activeConv.id });
        socketRef.current.emit('mark_read', { token, conversation_id: activeConv.id });
        loadConversations(token); // Update unread counts
      });

      // Clear typing users when switching chats
      setTypingUsers(new Set());
    }
  }, [activeConv, token]);

  // Message event listeners depend on activeConv
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConv) return;

    const handleReceive = (data) => {
      if (data.conversation_id === activeConv.id) {
        setMessages(prev => [...prev, data]);
        if (data.username !== username) {
          socket.emit('mark_read', { token, conversation_id: activeConv.id });
        }
      }
    };

    const handleEdit = (data) => {
      if (data.conversation_id === activeConv.id) {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, text: data.text, is_edited: true } : m));
      }
    };

    const handleDelete = (data) => {
      if (data.conversation_id === activeConv.id) {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, is_deleted: true } : m));
      }
    };

    const handleReaction = (data) => {
      if (data.conversation_id === activeConv.id) {
        setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
      }
    };

    const handleRead = (data) => {
      if (data.conversation_id === activeConv.id && data.reader !== username) {
        setMessages(prev => prev.map(m => ({ ...m, read: true })));
      }
    };

    const handleTyping = (data) => {
      if (data.conversation_id === activeConv.id && data.username !== username) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          if (data.typing) next.add(data.username);
          else next.delete(data.username);
          return next;
        });
      }
    };

    socket.on('receive_private_message', handleReceive);
    socket.on('message_edited', handleEdit);
    socket.on('message_deleted', handleDelete);
    socket.on('message_reaction_updated', handleReaction);
    socket.on('messages_read', handleRead);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('receive_private_message', handleReceive);
      socket.off('message_edited', handleEdit);
      socket.off('message_deleted', handleDelete);
      socket.off('message_reaction_updated', handleReaction);
      socket.off('messages_read', handleRead);
      socket.off('user_typing', handleTyping);
    };
  }, [activeConv, username, token]);

  const loadConversations = (tok) => {
    fetch('/conversations', { headers: { 'Authorization': `Bearer ${tok}` } })
      .then(res => res.json())
      .then(data => setConversations(data))
      .catch(console.error);
  };

  const fetchUsers = () => {
    const tok = localStorage.getItem('chat_token');
    fetch('/api/users', { headers: { 'Authorization': `Bearer ${tok}` } })
      .then(res => res.json())
      .then(data => setAllUsers(data))
      .catch(console.error);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_token');
    navigate('/login');
  };

  const handleStartChat = async (withUser) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ with: withUser })
    });
    if (res.ok) {
      const data = await res.json();
      const newConvList = await (await fetch('/conversations', { headers: { 'Authorization': `Bearer ${token}` } })).json();
      setConversations(newConvList);
      const c = newConvList.find(c => c.id === data.conversation_id);
      setActiveConv(c);
      setNewChatModalOpen(false);
    }
  };

  const handleCreateGroup = async (groupName, members) => {
    const res = await fetch('/api/conversations/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: groupName, members })
    });
    if (res.ok) {
      const data = await res.json();
      const newConvList = await (await fetch('/conversations', { headers: { 'Authorization': `Bearer ${token}` } })).json();
      setConversations(newConvList);
      const c = newConvList.find(c => c.id === data.conversation_id);
      setActiveConv(c);
      setNewChatModalOpen(false);
    }
  };

  const handleSendMessage = (text, fileUrl, fileType) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('send_private_message', {
      token,
      conversation_id: activeConv.id,
      text,
      file_url: fileUrl,
      file_type: fileType
    });
  };

  const handleEditMessage = (messageId, newText) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('edit_message', {
      token,
      message_id: messageId,
      new_text: newText
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('delete_message', {
      token,
      message_id: messageId
    });
  };

  const handleAddReaction = (messageId, emoji) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('add_reaction', {
      token,
      message_id: messageId,
      reaction: emoji
    });
  };

  const handleTyping = (isTyping) => {
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit('typing', {
      token,
      conversation_id: activeConv.id,
      typing: isTyping
    });
  };

  return (
    <div className="layout">
      <Sidebar 
        username={username} 
        avatarUrl={avatarUrl} 
        onOpenProfile={() => setProfileModalOpen(true)}
      />
      
      <ChatExplorer 
        conversations={conversations}
        currentConvId={activeConv?.id}
        onSelectConversation={setActiveConv}
        onNewChat={() => { fetchUsers(); setNewChatModalOpen(true); }}
        onlineUsers={onlineUsers}
        username={username}
      />
      
      <ChatWorkspace 
        activeConv={activeConv}
        messages={messages}
        username={username}
        onlineUsers={onlineUsers}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onAddReaction={handleAddReaction}
        onTyping={handleTyping}
        typingUsers={Array.from(typingUsers)}
      />

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setProfileModalOpen(false)}
        username={username}
        onLogout={handleLogout}
        onProfileUpdate={(data) => {
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }}
      />

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        allUsers={allUsers}
        username={username}
        onStartChat={handleStartChat}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}

export default Inbox;
