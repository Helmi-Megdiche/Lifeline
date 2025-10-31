"use client";

import { useState } from "react";

export default function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
      }}
      className="rounded-2xl backdrop-blur bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2 shadow-sm"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-transparent outline-none px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition"
      >
        Send
      </button>
    </form>
  );
}


