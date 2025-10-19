"use client";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="text-blue-600 text-xl">⬇️</div>
      <div className="text-sm text-gray-800">Install LifeLine for faster access</div>
      <div className="flex items-center gap-2 ml-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          onClick={async () => {
            if (!deferredPrompt) return;
            setShow(false);
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome !== 'accepted') {
              // allow future prompts
              setTimeout(() => setShow(true), 15000);
            }
            setDeferredPrompt(null);
          }}
        >
          Install
        </button>
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
          onClick={() => setShow(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}


