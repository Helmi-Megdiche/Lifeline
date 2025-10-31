"use client";

type Props = {
  isOwn?: boolean;
  username: string;
  text: string;
  timestamp: string;
};

export default function Message({ isOwn, username, text, timestamp }: Props) {
  return (
    <div className={`w-full flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] group">
        <div className={`text-[11px] mb-1 ${isOwn ? "text-right" : "text-left"} text-slate-500 dark:text-slate-400 transition-opacity`}>
          <span className="opacity-60 group-hover:opacity-100">{username} • {timestamp}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2 shadow-sm transition-transform will-change-transform ${
            isOwn
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm"
              : "backdrop-blur bg-white/80 dark:bg-white/10 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-white/10 rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}


