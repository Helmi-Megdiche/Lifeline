"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import Link from 'next/link';

interface StatusHistoryItem {
  status: 'safe' | 'help';
  timestamp: number;
}

interface StatusDoc {
  _id: string;
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId: string;
  statusHistory?: StatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface FlattenedStatusEntry {
  _id: string;
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId: string;
  createdAt?: string;
  isCurrentStatus: boolean; // Track if this is the current status or history
  originalDocId: string; // Track the original document ID
}

export default function HistoryPage() {
  const [statuses, setStatuses] = useState<FlattenedStatusEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const { user, token } = useAuth();

  // Flatten status history into individual status entries
  const flattenStatusHistory = (statusDoc: StatusDoc): FlattenedStatusEntry[] => {
    const entries: FlattenedStatusEntry[] = [];
    
    // Add current status (mark as current, cannot be deleted)
    entries.push({
      _id: `${statusDoc._id}_current`,
      status: statusDoc.status,
      timestamp: statusDoc.timestamp,
      latitude: statusDoc.latitude,
      longitude: statusDoc.longitude,
      userId: statusDoc.userId,
      createdAt: statusDoc.createdAt,
      isCurrentStatus: true,
      originalDocId: statusDoc._id,
    });

    // Add history entries (can be deleted)
    if (statusDoc.statusHistory && statusDoc.statusHistory.length > 0) {
      statusDoc.statusHistory.forEach((historyItem, index) => {
        entries.push({
          _id: `${statusDoc._id}_history_${index}`,
          status: historyItem.status as 'safe' | 'help',
          timestamp: historyItem.timestamp,
          latitude: statusDoc.latitude,
          longitude: statusDoc.longitude,
          userId: statusDoc.userId,
          isCurrentStatus: false,
          originalDocId: statusDoc._id,
        });
      });
    }

    return entries;
  };

  const loadStatuses = async () => {
    if (!user || !token) {
      setIsLoading(false);
      setError('Please log in to view your history');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_CONFIG.BASE_URL}/status/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch status history: ${response.statusText}`);
      }

      const result = await response.json();
      const statusDocs: StatusDoc[] = result.data || [];

      // Flatten all status documents and their history into individual entries
      const allEntries: FlattenedStatusEntry[] = [];
      statusDocs.forEach((doc) => {
        allEntries.push(...flattenStatusHistory(doc));
      });

      // Sort by timestamp descending (most recent first)
      allEntries.sort((a, b) => b.timestamp - a.timestamp);

      setStatuses(allEntries);
    } catch (error: any) {
      console.error('Error loading statuses:', error);
      setError(error.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadStatuses();
    } else if (!user) {
      setIsLoading(false);
      setError('Please log in to view your history');
    }
  }, [user, token]);

  const handleDeleteStatus = async (status: FlattenedStatusEntry) => {
    if (!user || !token) return;
    
    // Cannot delete current status, only history items
    if (status.isCurrentStatus) {
      alert('Cannot delete current status. You can only delete history entries.');
      return;
    }

    if (!confirm(`Are you sure you want to delete this status entry from ${new Date(status.timestamp).toLocaleString()}?`)) {
      return;
    }

    try {
      setDeletingId(status._id);
      const response = await fetch(`${API_CONFIG.BASE_URL}/status/user/${user.id}/history/${status.timestamp}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Delete failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to delete status entry: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Delete successful:', result);

      // Reload the statuses after deletion
      await loadStatuses();
    } catch (error: any) {
      console.error('Error deleting status:', error);
      alert(`Failed to delete status entry: ${error.message || 'Please try again.'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!user || !token) return;

    if (!confirm('Are you sure you want to clear ALL status history? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/status/user/${user.id}/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      // Reload the statuses after clearing
      await loadStatuses();
      alert('History cleared successfully!');
    } catch (error: any) {
      console.error('Error clearing history:', error);
      alert('Failed to clear history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/status"
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
          >
            <span>←</span>
            <span>Back to My Status</span>
          </Link>
        </div>

        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading history...</div>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/status"
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
          >
            <span>←</span>
            <span>Back to My Status</span>
          </Link>
        </div>

        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-dark-text-primary dark:to-dark-text-secondary bg-clip-text text-transparent mb-3">
            Unable to Load History
          </h1>
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary mb-6">
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            {!user && (
              <Link 
                href="/auth" 
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Login
              </Link>
            )}
            {user && (
              <>
                <button
                  onClick={loadStatuses}
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
                <Link
                  href="/status"
                  className="inline-block px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back to My Status
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
        >
          <span>←</span>
          <span>Back to My Status</span>
        </Link>
      </div>

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

      {/* Actions Bar */}
      <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
              Status History ({statuses.length} entries)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadStatuses}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            {statuses.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={isClearing || isLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? 'Clearing...' : 'Clear History'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status List */}
      <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
        {statuses.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-dark-border-primary">
            {statuses.map((status) => (
              <div key={status._id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      status.status === 'safe' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                      {status.status === 'safe' ? 'I\'m Safe' : 'Need Help'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500 text-white font-semibold">
                      Synced
                    </span>
                    {status.isCurrentStatus && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-500 text-white font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                      {new Date(status.timestamp).toLocaleString()}
                    </span>
                    {!status.isCurrentStatus && (
                      <button
                        onClick={() => handleDeleteStatus(status)}
                        disabled={deletingId === status._id}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {deletingId === status._id ? (
                          <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <span>🗑️</span>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
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
            No status history found. <Link href="/" className="text-blue-600 dark:text-emergency-blue-400 hover:text-blue-700 dark:hover:text-emergency-blue-600">Create your first check-in</Link>
          </div>
        )}
      </div>
    </div>
  );
}