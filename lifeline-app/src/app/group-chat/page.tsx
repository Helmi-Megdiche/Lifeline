"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Message from "@/components/Message";
import ChatInput from "@/components/ChatInput";

type ChatMsg = { id: string; userId: string; username: string; text: string; createdAt: string };

export default function GroupChatPage() {
  const currentUserId = "me";
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "1", userId: "u1", username: "helmi", text: "dfghj,;", createdAt: "3:45 PM" },
    { id: "2", userId: "u2", username: "ahmed", text: "what", createdAt: "4:18 PM" },
    { id: "3", userId: currentUserId, username: "you", text: "gbhn,", createdAt: "4:31 PM" },
  ]);

  const send = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), userId: currentUserId, username: "you", text, createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-indigo-50 to-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Group Chat</h1>
          <a href="/groups" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-black dark:text-white hover:bg-white/90 hover:shadow transition">
            ← Back to Group
          </a>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 backdrop-blur bg-white/70 dark:bg-slate-900/60 shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold">Group Chat</div>

          <div className="h-[52vh] sm:h-[58vh] overflow-y-auto p-5 space-y-3 bg-transparent">
            {messages.map((m) => (
              <Message key={m.id} isOwn={m.userId === currentUserId} username={m.username} text={m.text} timestamp={m.createdAt} />
            ))}
          </div>

          <div className="p-4 sticky bottom-0">
            <ChatInput onSend={send} />
          </div>
        </div>
      </main>
    </div>
  );
}


