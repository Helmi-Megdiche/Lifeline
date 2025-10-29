"use client";
import { useState, useEffect } from 'react';
import { usePouchDB } from '@/hooks/usePouchDB';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useSync } from '@/components/ClientSyncProvider';
import Link from 'next/link';

interface StatusDoc {
  _id: string;
  _rev: string;
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId?: string;
  synced: boolean;
  createdAt: string;
}

export default function HistoryPage() {
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [unsyncedStatuses, setUnsyncedStatuses] = useState<StatusDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unsynced'>('all');
  const { user } = useAuth();
  const { manualSync } = useSync();
  const { isClient, localDB } = usePouchDB();

  const getAllStatuses = async () => {
    if (!localDB) return [];

    try {
      // Try to use find with index first
      const result = await localDB.find({
        selector: {},
        sort: [{ timestamp: 'desc' }],
        use_index: 'timestamp-index'
      });
      return result.docs;
    } catch (error) {
      console.warn('Find query failed, using allDocs fallback:', error);
      // Fallback to allDocs if find fails
      try {
        const result = await localDB.allDocs({ include_docs: true });
        return result.rows
          .map((row: any) => row.doc)
          .filter((doc: any) => doc && !doc._id.startsWith('_'))
          .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  };

  const getUnsyncedStatuses = async () => {
    if (!localDB) return [];

    try {
      const result = await localDB.find({
        selector: { synced: false },
        sort: [{ timestamp: 'asc' }],
        use_index: 'synced-timestamp-index'
      });
      return result.docs;
    } catch (error) {
      console.warn('Find query failed, using allDocs fallback:', error);
      // Fallback to allDocs if find fails
      try {
        const result = await localDB.allDocs({ include_docs: true });
        return result.rows
          .map((row: any) => row.doc)
          .filter((doc: any) => doc && doc.synced === false && !doc._id.startsWith('_'))
          .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  };

  const loadStatuses = async () => {
    if (!isClient || !localDB) return;

    try {
      const [allStatuses, unsynced] = await Promise.all([
        getAllStatuses(),
        getUnsyncedStatuses()
      ]);

      // Filter by current user if logged in
      const filteredStatuses = user
        ? allStatuses.filter((status: StatusDoc) => status.userId === user.id)
        : allStatuses;

      const filteredUnsynced = user
        ? unsynced.filter((status: StatusDoc) => status.userId === user.id)
        : unsynced;

      setStatuses(filteredStatuses);
      setUnsyncedStatuses(filteredUnsynced);
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isClient && localDB) {
      loadStatuses();
    }
  }, [isClient, localDB, user]);

  const handleManualSync = async () => {
    try {
      await manualSync();
      await loadStatuses(); // Reload after sync
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-600 dark:text-dark-text-secondary">Loading history...</div>;
  }

  if (!isClient) {
    return <div className="text-center text-gray-600 dark:text-dark-text-secondary">Initializing...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-white text-2xl">📜</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-dark-text-primary dark:to-dark-text-secondary bg-clip-text text-transparent mb-3">
          My Status History
        </h1>
        <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
          View your past emergency check-ins, both local and synced.
        </p>
      </div>

      {/* Sync Status */}
      <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Sync Status</span>
          </div>
          <button
            onClick={handleManualSync}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Manual Sync
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-white/70 dark:bg-dark-surface-primary/70 text-gray-600 dark:text-dark-text-secondary hover:bg-blue-50 dark:hover:bg-dark-surface-secondary'
          }`}
        >
          All Statuses ({statuses.length})
        </button>
        <button
          onClick={() => setActiveTab('unsynced')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'unsynced'
              ? 'bg-orange-500 text-white'
              : 'bg-white/70 dark:bg-dark-surface-primary/70 text-gray-600 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-dark-surface-secondary'
          }`}
        >
          Unsynced ({unsyncedStatuses.length})
        </button>
      </div>

      {/* Status List */}
      <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
        {activeTab === 'all' ? (
          statuses.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-dark-border-primary">
              {statuses.map((status) => (
                <div key={status._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        status.status === 'safe' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                        {status.status === 'safe' ? 'I\'m Safe' : 'Need Help'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        status.synced ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {status.synced ? 'Synced' : 'Local Only'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                      {new Date(status.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {status.latitude && status.longitude && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                      📍 Location: {status.latitude.toFixed(4)}, {status.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-dark-text-tertiary">
              No statuses found. <Link href="/" className="text-blue-600 dark:text-emergency-blue-400 hover:text-blue-700 dark:hover:text-emergency-blue-600">Create your first check-in</Link>
            </div>
          )
        ) : (
          unsyncedStatuses.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-dark-border-primary">
              {unsyncedStatuses.map((status) => (
                <div key={status._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        status.status === 'safe' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                        {status.status === 'safe' ? 'I\'m Safe' : 'Need Help'}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-500 text-white font-semibold">
                        Pending Sync
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                      {new Date(status.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {status.latitude && status.longitude && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                      📍 Location: {status.latitude.toFixed(4)}, {status.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-dark-text-tertiary">
              All statuses are synced! 🎉
            </div>
          )
        )}
      </div>
    </div>
  );
}