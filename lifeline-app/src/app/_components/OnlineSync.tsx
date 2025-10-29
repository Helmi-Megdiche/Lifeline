"use client";
import { useEffect, useRef, useState } from "react";
import { getQueuedStatuses, clearQueuedStatus } from "@/lib/indexedDB";
import { getApiUrl, API_CONFIG } from "@/lib/config";

export default function OnlineSync() {
  const [toast, setToast] = useState<string | null>(null);
  const retryRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    async function flushQueue() {
      try {
        const items = await getQueuedStatuses();
        if (items.length === 0) return;
        let anyFailed = false;
        for (const item of items) {
          try {
            const res = await fetch(getApiUrl(API_CONFIG.STATUS_ENDPOINT), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            if (item.id != null) await clearQueuedStatus(item.id);
          } catch {
            anyFailed = true;
          }
        }
        if (!anyFailed) {
          retryRef.current = 0;
          setToast("Queued statuses synced");
          setTimeout(() => setToast(null), 2500);
        } else {
          // Exponential backoff up to ~1 minute
          retryRef.current = Math.min(retryRef.current + 1, 5);
          const delayMs = Math.pow(2, retryRef.current) * 1000;
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            if (navigator.onLine) flushQueue();
          }, delayMs);
        }
      } catch {
        // try later
      }
    }

    const onOnline = () => {
      if (navigator.onLine) flushQueue();
    };
    window.addEventListener("online", onOnline);
    onOnline();
    return () => {
      window.removeEventListener("online", onOnline);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return toast ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium shadow-lg backdrop-blur-sm border border-green-400/20 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2">
        <span className="text-green-200">✓</span>
        {toast}
      </div>
    </div>
  ) : null;
}


