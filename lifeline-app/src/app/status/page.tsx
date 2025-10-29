"use client";
import { useEffect, useState } from "react";
import { usePouchDB } from "@/hooks/usePouchDB";
import { useAuth } from "@/contexts/ClientAuthContext";
import { useSync } from "@/hooks/useSync";

type LocalStatus = {
  status: "safe" | "help";
  timestamp: number;
  synced?: boolean;
};

export default function MyStatusPage() {
  const [last, setLast] = useState<LocalStatus | null>(null);
  const { isClient, localDB } = usePouchDB();
  const { user } = useAuth();
  const { manualSync } = useSync();

  useEffect(() => {
    (async () => {
      if (!isClient || !localDB || !user?.id) return;

      try {
        // Get the single status document for this user from PouchDB
        const docId = `user_${user.id}_status`;
        const doc = await localDB.get(docId).catch(() => null);
        
        if (doc) {
          setLast({
            status: doc.status,
            timestamp: doc.timestamp,
            synced: doc.synced || false,
          });
        }
      } catch (error) {
        console.error('Error fetching status from PouchDB:', error);
      }
    })();
  }, [isClient, localDB, user]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-white text-2xl">📊</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-dark-text-primary dark:to-dark-text-secondary bg-clip-text text-transparent mb-3">
          My Status
        </h1>
        <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
          Your latest emergency check-in status and sync information.
        </p>
      </div>

      {!last ? (
        <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 p-8 text-center shadow-lg">
          <div className="text-gray-400 dark:text-dark-text-tertiary text-4xl mb-4">📱</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Status Yet</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">You haven't checked in yet. Use the emergency buttons on the home page to save your status.</p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <span>🏠</span>
            Go to Check-In
          </a>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-dark-surface-primary/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                last.status === "safe" 
                  ? "bg-gradient-to-br from-green-500 to-green-600" 
                  : "bg-gradient-to-br from-red-500 to-red-600"
              }`}>
                <span className="text-white text-2xl">
                  {last.status === "safe" ? "✓" : "⚠"}
                </span>
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${
                  last.status === "safe" ? "text-green-700 dark:text-emergency-green-400" : "text-red-700 dark:text-emergency-red-400"
                }`}>
                  {last.status === "safe" ? "I'm Safe" : "Need Help"}
                </h2>
                <p className="text-gray-600 dark:text-dark-text-secondary">Latest status update</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50/50 dark:bg-dark-surface-secondary/50 rounded-xl p-4 border border-gray-200/60 dark:border-dark-border-primary/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary text-sm mb-1">
                <span>🕒</span>
                Timestamp
              </div>
              <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                {new Date(last.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-dark-surface-secondary/50 rounded-xl p-4 border border-gray-200/60 dark:border-dark-border-primary/60">
              <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary text-sm mb-1">
                <span>{last.synced ? "✅" : "📡"}</span>
                Sync Status
              </div>
              <div className={`font-medium ${last.synced ? "text-green-600 dark:text-emergency-green-400" : "text-amber-600 dark:text-emergency-yellow-400"}`}>
                {last.synced ? "Synced" : "Offline"}
              </div>
            </div>
          </div>

          {(last as any).latitude != null && (last as any).longitude != null && (
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/60">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                <span>📍</span>
                Location Captured
              </div>
              <div className="font-mono text-sm text-gray-700">
                {(last as any).latitude?.toFixed(5)}, {(last as any).longitude?.toFixed(5)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                This helps emergency responders locate you
              </div>
            </div>
          )}

                  <div className="mt-6 pt-6 border-t border-gray-200/60 flex flex-wrap gap-4">
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                    >
                      <span>↻</span>
                      Update Status
                    </a>
                    <button
                      onClick={() => {
                        console.log('Force sync button clicked');
                        manualSync();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg transition-colors"
                    >
                      <span>📡</span>
                      Force Sync
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("This will clear all saved data. Are you sure?")) {
                          // Clear everything
                          localStorage.clear();
                          try {
                            // Clear IndexedDB
                            const dbRequest = indexedDB.deleteDatabase("lifeline-db");
                            dbRequest.onsuccess = () => {
                              console.log("IndexedDB cleared");
                              window.location.href = "/";
                            };
                            dbRequest.onerror = () => {
                              console.log("IndexedDB clear failed, redirecting anyway");
                              window.location.href = "/";
                            };
                          } catch (error) {
                            console.log("Error clearing IndexedDB:", error);
                            window.location.href = "/";
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-colors"
                    >
                      <span>🗑️</span>
                      Clear All Data
                    </button>
                  </div>
        </div>
      )}
    </div>
  );
}


