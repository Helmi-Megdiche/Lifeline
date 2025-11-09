'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { API_CONFIG } from '@/lib/config';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  alertId?: string;
  alertData?: {
    _id: string;
    category: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    severity: string;
    username: string;
    createdAt: string;
  };
}

export default function Chat({ groupId }: { groupId: string }) {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showMenuMessageId, setShowMenuMessageId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const messagesCountRef = useRef(0);

  const fetchMessages = useCallback(async (preserveScroll = false) => {
    if (!token) return;
    
    // Save current scroll position and message count if preserving
    let scrollTop = 0;
    const previousMessageCount = messagesCountRef.current;
    
    if (preserveScroll && listRef.current) {
      scrollTop = listRef.current.scrollTop;
    }
    
    try {
      // Only show loading on initial fetch
      if (!preserveScroll) {
        setLoading(true);
      }
      
      const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const newMessageCount = data.length;
        const hasNewMessages = newMessageCount > previousMessageCount;
        
        // Update ref before setting state
        messagesCountRef.current = newMessageCount;
        setMessages(data);
        
        // Restore scroll position if preserving and no new messages
        if (preserveScroll && listRef.current && !hasNewMessages) {
          // Use double requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (listRef.current) {
                listRef.current.scrollTop = scrollTop;
              }
            });
          });
        }
      }
    } finally { 
      if (!preserveScroll) {
        setLoading(false);
      }
    }
  }, [groupId, token]);

  useEffect(() => { 
    messagesCountRef.current = 0; // Reset on group change
    fetchMessages(false); 
  }, [groupId, token, fetchMessages]);

  useEffect(() => {
    if (!token) return;
    
    const id = setInterval(() => {
      // Check if user is near bottom before fetching
      if (listRef.current) {
        const el = listRef.current;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        setShouldAutoScroll(nearBottom);
        // Preserve scroll if user is not at bottom
        fetchMessages(!nearBottom);
      } else {
        fetchMessages(false);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [fetchMessages, token]);

  useEffect(() => {
    if (!shouldAutoScroll || !endRef.current) return;
    
    // Use requestAnimationFrame to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      if (endRef.current && shouldAutoScroll) {
        endRef.current.scrollIntoView({ behavior: 'auto' }); // Use 'auto' instead of 'smooth' to prevent glitching
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, shouldAutoScroll]); // Only trigger on message count change

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuMessageId(null);
      }
    };

    if (showMenuMessageId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showMenuMessageId]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingMessageId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        setText('');
        setShouldAutoScroll(true);
        fetchMessages();
      }
    } finally { setSending(false); }
  };

  const startEdit = (message: Message) => {
    if (message.alertId) return; // Can't edit alert messages
    setEditingMessageId(message.id);
    setEditText(message.text);
    setShowMenuMessageId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editText.trim() || !token) return;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: editText.trim() })
      });
      if (res.ok) {
        setEditingMessageId(null);
        setEditText('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!token || !confirm('Are you sure you want to delete this message?')) return;
    setDeletingMessageId(messageId);
    setShowMenuMessageId(null);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const isLight = theme === 'light';

  return (
    <div 
      className="rounded-2xl shadow-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: isLight ? '#ffffff' : '#1f2937',
        minHeight: 'calc(100vh - 200px)',
        maxHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div 
        className="px-4 sm:px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10"
        style={{
          borderColor: isLight ? '#e5e7eb' : '#374151',
          backgroundColor: isLight ? '#ffffff' : '#1f2937',
          backdropFilter: 'blur(10px)'
        }}
      >
        <h3 className="text-lg sm:text-xl font-bold" style={{ color: isLight ? '#111827' : '#ffffff' }}>
          💬 Group Chat
        </h3>
        {messages.length > 0 && (
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={isLight ? {
              backgroundColor: '#dbeafe',
              color: '#1e40af'
            } : {
              backgroundColor: '#1e3a8a',
              color: '#93c5fd'
            }}
          >
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        )}
      </div>
      
      {/* Messages */}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          setShouldAutoScroll(nearBottom);
        }}
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4"
        style={{
          backgroundColor: isLight ? '#f9fafb' : '#111827',
          minHeight: 0,
          scrollBehavior: 'smooth'
        }}
      >
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-4">💬</div>
            <p style={{ color: isLight ? '#6b7280' : '#9ca3af' }} className="text-base font-medium">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}
        {messages.map(m => {
          const isSharedAlert = m.alertId && m.alertData;
          const isOwnMessage = m.userId === user?.id;
          
          if (isSharedAlert) {
            const alert = m.alertData!;
            const getSeverityConfig = (severity: string) => {
              const sev = severity.toLowerCase();
              if (sev === 'critical') {
                return {
                  border: isLight ? '#f87171' : '#dc2626',
                  bg: isLight ? '#fee2e2' : 'rgba(220, 38, 38, 0.2)',
                  badgeBg: isLight ? '#fecaca' : '#991b1b',
                  badgeText: isLight ? '#991b1b' : '#fecaca'
                };
              } else if (sev === 'high') {
                return {
                  border: isLight ? '#fb923c' : '#ea580c',
                  bg: isLight ? '#fed7aa' : 'rgba(234, 88, 12, 0.2)',
                  badgeBg: isLight ? '#fdba74' : '#9a3412',
                  badgeText: isLight ? '#9a3412' : '#fdba74'
                };
              } else if (sev === 'medium') {
                return {
                  border: isLight ? '#facc15' : '#ca8a04',
                  bg: isLight ? '#fef9c3' : 'rgba(202, 138, 4, 0.2)',
                  badgeBg: isLight ? '#fde047' : '#854d0e',
                  badgeText: isLight ? '#854d0e' : '#fde047'
                };
              } else {
                return {
                  border: isLight ? '#4ade80' : '#16a34a',
                  bg: isLight ? '#dcfce7' : 'rgba(22, 163, 74, 0.2)',
                  badgeBg: isLight ? '#86efac' : '#166534',
                  badgeText: isLight ? '#166534' : '#86efac'
                };
              }
            };
            
            const severityConfig = getSeverityConfig(alert.severity);
            
            return (
              <div key={m.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group relative`}>
                <div 
                  className="rounded-2xl shadow-lg overflow-hidden max-w-[90%] sm:max-w-[75%] md:max-w-[65%] relative"
                  style={{
                    backgroundColor: isOwnMessage 
                      ? (isLight ? '#f3e8ff' : '#7c3aed')
                      : (isLight ? '#ffffff' : '#374151'),
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: severityConfig.border,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl flex-shrink-0">🚨</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs mb-1.5 flex items-center justify-between" style={{ color: isLight ? '#6b7280' : '#9ca3af' }}>
                          <span>
                            <span className="font-semibold" style={{ color: isLight ? '#374151' : '#d1d5db' }}>
                              {m.username}
                            </span>
                            {' shared an alert · '}
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwnMessage && (
                            <div className="relative ml-2" ref={menuRef}>
                              <button
                                onClick={() => setShowMenuMessageId(showMenuMessageId === m.id ? null : m.id)}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 sm:p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20 touch-manipulation"
                                style={{ fontSize: '18px', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                aria-label="Message options"
                              >
                                ⋮
                              </button>
                              {showMenuMessageId === m.id && (
                                <>
                                  {/* Backdrop for mobile */}
                                  <div 
                                    className="fixed inset-0 z-10 sm:hidden"
                                    onClick={() => setShowMenuMessageId(null)}
                                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                                  />
                                  <div 
                                    className="absolute right-0 top-8 sm:top-6 z-20 rounded-lg shadow-xl border min-w-[140px] sm:min-w-[140px] overflow-hidden"
                                    style={{
                                      backgroundColor: isLight ? '#ffffff' : '#374151',
                                      borderColor: isLight ? '#e5e7eb' : '#4b5563',
                                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <button
                                      onClick={() => handleDelete(m.id)}
                                      disabled={deletingMessageId === m.id}
                                      className="w-full text-left px-4 py-3 sm:py-3 text-sm font-medium transition-colors flex items-center gap-2 active:bg-red-50 dark:active:bg-red-900/20 text-red-600 dark:text-red-400 disabled:opacity-50 touch-manipulation"
                                      style={{
                                        minHeight: '44px' // Mobile touch target
                                      }}
                                    >
                                      {deletingMessageId === m.id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                          <span>Deleting...</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-base">🗑️</span>
                                          <span>Remove from Chat</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div 
                          className="font-bold text-base sm:text-lg mb-2"
                          style={{ color: isOwnMessage ? (isLight ? '#6b21a8' : '#ffffff') : (isLight ? '#111827' : '#ffffff') }}
                        >
                          {alert.title}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="rounded-lg p-3 mb-3"
                      style={{
                        backgroundColor: isLight ? '#f9fafb' : 'rgba(55, 65, 81, 0.5)'
                      }}
                    >
                      <p 
                        className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed"
                        style={{ color: isLight ? '#374151' : '#d1d5db' }}
                      >
                        {alert.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span 
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={isLight ? {
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        } : {
                          backgroundColor: '#4b5563',
                          color: '#d1d5db'
                        }}
                      >
                        <span>📍</span>
                        <span className="truncate max-w-[200px] sm:max-w-none">
                          {alert.location?.address || `${alert.location?.lat?.toFixed(4)}, ${alert.location?.lng?.toFixed(4)}`}
                        </span>
                      </span>
                      <span 
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: severityConfig.badgeBg,
                          color: severityConfig.badgeText
                        }}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      <span 
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={isLight ? {
                          backgroundColor: '#e5e7eb',
                          color: '#374151'
                        } : {
                          backgroundColor: '#4b5563',
                          color: '#d1d5db'
                        }}
                      >
                        {alert.category}
                      </span>
                    </div>
                    <div 
                      className="text-xs pt-2 border-t"
                      style={{
                        color: isLight ? '#9ca3af' : '#6b7280',
                        borderColor: isLight ? '#e5e7eb' : '#4b5563'
                      }}
                    >
                      Alert by <span className="font-semibold">{alert.username}</span> · {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          
          if (editingMessageId === m.id) {
            return (
              <div key={m.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                <div 
                  className="rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] shadow-lg"
                  style={isOwnMessage ? {
                    backgroundColor: isLight ? '#dbeafe' : '#1e3a8a',
                    border: `2px solid ${isLight ? '#3b82f6' : '#60a5fa'}`
                  } : {
                    backgroundColor: isLight ? '#f3f4f6' : '#374151',
                    border: `2px solid ${isLight ? '#d1d5db' : '#4b5563'}`
                  }}
                >
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm sm:text-base focus:outline-none mb-2"
                    style={{
                      backgroundColor: isLight ? '#ffffff' : '#1f2937',
                      color: isLight ? '#111827' : '#ffffff',
                      border: `1px solid ${isLight ? '#d1d5db' : '#4b5563'}`
                    }}
                    maxLength={2000}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isLight ? '#e5e7eb' : '#4b5563',
                        color: isLight ? '#374151' : '#f9fafb'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editText.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: editText.trim() ? '#2563eb' : (isLight ? '#d1d5db' : '#4b5563'),
                        color: '#ffffff'
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={m.id} 
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group relative`}
            >
              <div 
                className="rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] shadow-md relative"
                style={isOwnMessage ? {
                  backgroundColor: isLight ? '#2563eb' : '#3b82f6',
                  color: '#ffffff'
                } : {
                  backgroundColor: isLight ? '#ffffff' : '#374151',
                  color: isLight ? '#111827' : '#f9fafb',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid #4b5563'
                }}
              > 
                <div 
                  className="text-xs mb-1.5 font-medium flex items-center justify-between"
                  style={{ opacity: 0.85 }}
                >
                  <span>
                    {m.username} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isOwnMessage && !m.alertId && (
                    <div className="relative ml-2" ref={menuRef}>
                      <button
                        onClick={() => setShowMenuMessageId(showMenuMessageId === m.id ? null : m.id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 sm:p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20 touch-manipulation"
                        style={{ fontSize: '18px', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Message options"
                      >
                        ⋮
                      </button>
                      {showMenuMessageId === m.id && (
                        <>
                          {/* Backdrop for mobile */}
                          <div 
                            className="fixed inset-0 z-10 sm:hidden"
                            onClick={() => setShowMenuMessageId(null)}
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                          />
                          <div 
                            className="absolute right-0 top-8 sm:top-6 z-20 rounded-lg shadow-xl border min-w-[140px] sm:min-w-[140px] overflow-hidden"
                            style={{
                              backgroundColor: isLight ? '#ffffff' : '#374151',
                              borderColor: isLight ? '#e5e7eb' : '#4b5563',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }}
                          >
                            <button
                              onClick={() => startEdit(m)}
                              className="w-full text-left px-4 py-3 sm:py-3 text-sm font-medium transition-colors flex items-center gap-2 active:bg-gray-100 dark:active:bg-gray-700 touch-manipulation"
                              style={{
                                color: isLight ? '#374151' : '#f9fafb',
                                minHeight: '44px' // Mobile touch target
                              }}
                            >
                              <span className="text-base">✏️</span>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              disabled={deletingMessageId === m.id}
                              className="w-full text-left px-4 py-3 sm:py-3 text-sm font-medium transition-colors flex items-center gap-2 active:bg-red-50 dark:active:bg-red-900/20 text-red-600 dark:text-red-400 disabled:opacity-50 touch-manipulation"
                              style={{
                                minHeight: '44px' // Mobile touch target
                              }}
                            >
                              {deletingMessageId === m.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base">🗑️</span>
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {/* Composer */}
      <div 
        className="border-t px-3 sm:px-5 py-3 sm:py-4 sticky bottom-0"
        style={{
          borderColor: isLight ? '#e5e7eb' : '#374151',
          backgroundColor: isLight ? '#ffffff' : '#1f2937',
          backdropFilter: 'blur(10px)'
        }}
      >
        <form onSubmit={send} className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
        <input
              ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
              className="w-full px-4 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base focus:outline-none transition-all resize-none"
              style={{
                backgroundColor: isLight ? '#f3f4f6' : '#374151',
                color: isLight ? '#111827' : '#ffffff',
                border: `2px solid ${isLight ? '#e5e7eb' : '#4b5563'}`,
                paddingRight: text.trim() ? '3.5rem' : '1rem'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isLight ? '#e5e7eb' : '#4b5563';
              }}
              maxLength={2000}
            />
            {text.length > 0 && (
              <span 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs"
                style={{ color: isLight ? '#9ca3af' : '#6b7280' }}
              >
                {text.length}/2000
              </span>
            )}
          </div>
          <button 
            type="submit"
            disabled={sending || !text.trim()} 
            className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] sm:min-w-[100px] justify-center"
            style={{
              backgroundColor: sending || !text.trim() 
                ? (isLight ? '#d1d5db' : '#4b5563')
                : '#2563eb',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (!sending && text.trim()) {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }
            }}
            onMouseLeave={(e) => {
              if (!sending && text.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Send</span>
              </>
            )}
        </button>
      </form>
      </div>
    </div>
  );
}


