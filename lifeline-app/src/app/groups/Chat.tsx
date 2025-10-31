'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';

export default function Chat({ groupId }: { groupId: string }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: string; userId: string; username: string; text: string; createdAt: string }>>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, [groupId, token]);

  useEffect(() => {
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [groupId, token]);

  useEffect(() => {
    if (!shouldAutoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, shouldAutoScroll]);

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

  return (
    <div className="card-surface force-light-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-transparent">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Group Chat</h3>
      </div>
      {/* Messages */}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setShouldAutoScroll(nearBottom);
        }}
        className="p-5 max-h-80 overflow-y-auto space-y-3 bg-transparent"
      >
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`${m.userId === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'} px-3 py-2 rounded-xl max-w-[80%] shadow-sm`}> 
              <div className="text-[11px] opacity-80 mb-0.5">{m.username} · {new Date(m.createdAt).toLocaleTimeString()}</div>
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {/* Composer */}
      <form onSubmit={send} className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2 bg-transparent">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 force-light-input"
        />
        <button disabled={sending || !text.trim()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white shadow">
          Send
        </button>
      </form>
    </div>
  );
}


