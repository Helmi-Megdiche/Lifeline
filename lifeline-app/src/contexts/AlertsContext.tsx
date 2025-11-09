"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import { useSync } from '@/components/ClientSyncProvider';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useMapSnapshotCache } from '@/hooks/useMapSnapshotCache';
import { captureMapSnapshot } from '@/lib/mapSnapshot';
// PouchDB imports removed - using REST API only
// import PouchDB from 'pouchdb-browser';
// import PouchFind from 'pouchdb-find';
import ConfirmationModal from '@/components/ConfirmationModal';
import NotificationToast from '@/components/NotificationToast';

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Alert {
  _id: string;
  _rev?: string;
  userId: string;
  username: string;
  category: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'false_alarm';
  reportCount: number;
  reportedBy: string[];
  dedupHash: string;
  createdAt: string;
  expiresAt: string;
  synced: boolean;
  hidden: boolean;
  comments?: Array<{
    userId: string;
    username: string;
    comment: string;
    createdAt: string | Date;
  }>;
  // Legacy fields for backward compatibility
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  deDupHash?: string;
  roundedLatitude?: number;
  roundedLongitude?: number;
  offlineCreated?: boolean;
}

interface CreateAlertPayload {
  latitude: number;
  longitude: number;
  category: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ttlHours?: number;
  location?: { lat: number; lng: number; address?: string };
}

interface AlertsContextType {
  alerts: Alert[];
  createAlert: (payload: CreateAlertPayload) => Promise<void>;
  updateAlert: (alertId: string, payload: Partial<CreateAlertPayload>) => Promise<void>;
  reportAlert: (alertId: string) => Promise<void>;
  addComment: (alertId: string, comment: string) => Promise<void>;
  updateComment: (alertId: string, commentIndex: number, comment: string) => Promise<void>;
  deleteComment: (alertId: string, commentIndex: number) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  isLoadingAlerts: boolean;
  syncAlertsStatus: string;
  filterCategory: string | null;
  setFilterCategory: (category: string | null) => void;
  filterSeverity: string | null;
  setFilterSeverity: (severity: string | null) => void;
  mapBounds: { north: number; east: number; south: number; west: number } | null;
  setMapBounds: (bounds: { north: number; east: number; south: number; west: number } | null) => void;
  manualSyncAlerts: () => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  clearOldData: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token, isAuthenticated, isOnline } = useAuth();
  const { queueAlert } = useOfflineQueue();
  const { cacheMapSnapshot } = useMapSnapshotCache();

  // Note: Removed global error suppression as it wasn't effective
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [syncAlertsStatus, setSyncAlertsStatus] = useState('idle');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{ north: number; east: number; south: number; west: number } | null>(null);
  const [remoteAlertsDB, setRemoteAlertsDB] = useState<any>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Notification toast state
  const [notificationToast, setNotificationToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const { manualSync } = useSync();

  // Helper function to show notifications
  const showNotification = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setNotificationToast({
      isOpen: true,
      message,
      type
    });
  }, []);

  // PouchDB removed - using REST API only
  const localDB = null;

  // PouchDB authedFetch removed - using standard fetch with token
  const authedFetch = useCallback((url: any, opts: any = {}) => {
    if (!token) {
      return Promise.reject(new Error('No authentication token available'));
    }
    
    const headers = new Headers(opts.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    
    return fetch(url, { ...opts, headers });
  }, [token]);

  // PouchDB indexes removed - using REST API only

  // PouchDB replication removed - using REST API only

  const fetchAlerts = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoadingAlerts(true);

      // Build query parameters for the REST API call
      const queryParams = new URLSearchParams();
      
      // Add map bounds if available
      if (mapBounds) {
        queryParams.append('minLat', mapBounds.south.toString());
        queryParams.append('maxLat', mapBounds.north.toString());
        queryParams.append('minLng', mapBounds.west.toString());
        queryParams.append('maxLng', mapBounds.east.toString());
      }
      
      // Add filters if available
      if (filterCategory) {
        queryParams.append('category', filterCategory);
      }
      
      if (filterSeverity) {
        queryParams.append('severity', filterSeverity);
      }
      
      // Add limit
      queryParams.append('limit', '100');
      
      const apiUrl = `${API_CONFIG.BASE_URL}/alerts?${queryParams.toString()}`;
      
      console.log('🔍 Fetching alerts from API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 API Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const apiData = await response.json();
        const alerts = apiData.alerts || [];
        console.log('✅ API alerts fetched:', alerts.length, 'alerts');
        
        // Sort by createdAt (newest first)
        const sortedAlerts = alerts.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        setAlerts(sortedAlerts as Alert[]);
      } else {
        console.error('❌ API fetch failed:', response.status, response.statusText);
        setAlerts([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [token, filterCategory, filterSeverity, mapBounds]);

  // Fetch alerts when filters change
  useEffect(() => {
    if (token && user?.id) {
      fetchAlerts();
    }
  }, [fetchAlerts, token, user?.id]);

  // Periodic refresh of alerts when online
  useEffect(() => {
    if (!isOnline || !token || !user?.id) return;

    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Refresh every 30 seconds when online

    return () => clearInterval(interval);
  }, [isOnline, token, user?.id, fetchAlerts]);

  // Refresh alerts when the offline queue flushes
  useEffect(() => {
    const onFlushed = () => fetchAlerts();
    window.addEventListener('lifeline-queue-flushed', onFlushed as any);
    window.addEventListener('online', onFlushed);
    return () => {
      window.removeEventListener('lifeline-queue-flushed', onFlushed as any);
      window.removeEventListener('online', onFlushed);
    };
  }, [fetchAlerts]);

  const createAlert = useCallback(async (payload: CreateAlertPayload) => {
    if (!user?.id || !user?.username) {
      throw new Error('User not authenticated.');
    }

    // Normalize coordinates from either payload.latitude/longitude or payload.location
    const lat = typeof payload.latitude === 'number' ? payload.latitude : payload.location?.lat;
    const lng = typeof payload.longitude === 'number' ? payload.longitude : payload.location?.lng;

    if (lat == null || lng == null) {
      throw new Error('Missing coordinates for alert (latitude/longitude).');
    }

    // Build location object according to backend DTO
    const location = {
      lat,
      lng,
      address: payload.location?.address
    };

    const alertPayload = {
      category: payload.category,
      title: payload.title,
      description: payload.description,
      severity: payload.severity,
      location: location,
      ttlHours: payload.ttlHours || 24
    };

    // Capture map snapshot (async, don't block alert creation)
    const captureMap = async () => {
      try {
        const snapshot = await captureMapSnapshot(lat, lng);
        if (snapshot) {
          return snapshot;
        }
      } catch (error) {
        console.error('Failed to capture map snapshot:', error);
      }
      return null;
    };

    // Start capturing map snapshot (non-blocking)
    const mapSnapshotPromise = captureMap();

    // Check if offline or no token
    const isOffline = !navigator.onLine;
    const hasToken = !!token;

    // If offline or no token, queue the alert
    if (isOffline || !hasToken) {
      try {
        // Queue alert and get the queued alert ID
        const queuedAlertId = queueAlert(alertPayload);
        
        // Cache map snapshot if available, using the same queued alert ID
        const snapshot = await mapSnapshotPromise;
        if (snapshot && queuedAlertId) {
          // Use the queued alert ID so we can map it when the alert syncs
          cacheMapSnapshot(queuedAlertId, snapshot);
          console.log(`🗺️ Cached map snapshot for queued alert: ${queuedAlertId}`);
        }
        
        showNotification(
          isOffline 
            ? 'Alert queued. Will sync when online.'
            : 'Alert queued. Will sync when authenticated.',
          'info'
        );
        return; // Don't throw, just queue it
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          showNotification('Storage full. Please clear some data and try again.', 'error');
        } else {
          showNotification('Failed to queue alert. Please try again.', 'error');
        }
        throw error;
      }
    }

    // Online and authenticated - send immediately
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alertPayload)
      });

      if (response.ok) {
        const result = await response.json();
        const createdAlert = result.alert;
        
        // Wait for map snapshot and sync it
        const snapshot = await mapSnapshotPromise;
        if (snapshot && createdAlert?._id) {
          if (navigator.onLine && token) {
            // Try to sync immediately
            try {
              await fetch(`${API_CONFIG.BASE_URL}/alerts/${createdAlert._id}/map`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  lat: snapshot.lat,
                  lng: snapshot.lng,
                  mapImage: snapshot.mapImage,
                  timestamp: snapshot.timestamp,
                  locationUnavailable: snapshot.locationUnavailable,
                }),
              });
            } catch (error) {
              // If sync fails, cache it for later
              console.warn('Failed to sync map snapshot immediately, caching for later:', error);
              cacheMapSnapshot(createdAlert._id, snapshot);
            }
          } else {
            // Offline - cache it
            cacheMapSnapshot(createdAlert._id, snapshot);
          }
        }
        
        await fetchAlerts();
        showNotification('Alert created successfully!', 'success');
      } else {
        const errorText = await response.text();
        
        // If server error or network issue, queue it
        if (response.status >= 500 || !navigator.onLine) {
          try {
            const queuedAlertId = queueAlert(alertPayload);
            
            // Cache map snapshot if available, using the queued alert ID
            const snapshot = await mapSnapshotPromise;
            if (snapshot && queuedAlertId) {
              cacheMapSnapshot(queuedAlertId, snapshot);
              console.log(`🗺️ Cached map snapshot for queued alert: ${queuedAlertId}`);
            }
            
            showNotification('Alert queued due to server error. Will retry automatically.', 'warning');
            return;
          } catch (queueError) {
            console.error('Failed to queue alert:', queueError);
          }
        }
        
        throw new Error(errorText || 'Failed to create alert');
      }
    } catch (error: any) {
      console.error('❌ Failed to create alert:', error);
      
      // If network error, queue it
      if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
        try {
          const queuedAlertId = queueAlert(alertPayload);
          
          // Cache map snapshot if available, using the queued alert ID
          const snapshot = await mapSnapshotPromise;
          if (snapshot && queuedAlertId) {
            cacheMapSnapshot(queuedAlertId, snapshot);
            console.log(`🗺️ Cached map snapshot for queued alert: ${queuedAlertId}`);
          }
          
          showNotification('Alert queued (offline). Will sync when connection is restored.', 'info');
          return;
        } catch (queueError) {
          console.error('Failed to queue alert:', queueError);
        }
      }
      
      showNotification('Failed to create alert. Please try again.', 'error');
      throw error;
    }
  }, [token, user, fetchAlerts, showNotification, queueAlert, cacheMapSnapshot]);

  const updateAlert = useCallback(async (alertId: string, payload: Partial<CreateAlertPayload>) => {
    if (!token || !user?.id) {
      throw new Error('User not authenticated.');
    }

    try {
      const updateData: any = {};
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.category !== undefined) updateData.category = payload.category;
      if (payload.severity !== undefined) updateData.severity = payload.severity;
      if (payload.location) {
        updateData.latitude = payload.location.lat;
        updateData.longitude = payload.location.lng;
      } else if (payload.latitude !== undefined && payload.longitude !== undefined) {
        updateData.latitude = payload.latitude;
        updateData.longitude = payload.longitude;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchAlerts();
        showNotification('Alert updated successfully!', 'success');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update alert');
      }
    } catch (error) {
      console.error('❌ Failed to update alert:', error);
      showNotification('Failed to update alert. Please try again.', 'error');
      throw error;
    }
  }, [token, user, fetchAlerts, showNotification]);

  const reportAlert = useCallback(async (alertId: string) => {
    if (!token || !user?.id) {
      throw new Error('User not authenticated.');
    }

    try {
      // Call the backend API to report the alert
      if (isOnline && token) {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}/report`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: 'User reported this alert' })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Alert reported successfully:', result);
            showNotification('Alert reported successfully!', 'success');
            // Refresh alerts to get updated count
            await fetchAlerts();
          } else {
            console.error('❌ Backend returned error status:', response.status);
            console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
            
            let errorData: any = { message: `Backend returned ${response.status}` };
            
            // Try to parse error response
            try {
              const contentType = response.headers.get('content-type');
              
              // Clone the response for reading
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              
              console.log('❌ Response Content-Type:', contentType);
              console.log('❌ Response body text:', text);
              
              if (text) {
                if (contentType && contentType.includes('application/json')) {
                  try {
                    errorData = JSON.parse(text);
                    console.log('❌ Parsed error data:', errorData);
                  } catch (jsonError) {
                    console.error('Failed to parse JSON:', jsonError);
                    errorData = { message: text };
                  }
                } else {
                  errorData = { message: text };
                }
              }
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
              errorData = { message: `Backend returned ${response.status}` };
            }
            
            console.error('❌ Final error data:', errorData);
            
            // Handle specific error messages - check multiple possible error field names
            const errorMessage = errorData.message || 
                                errorData.error || 
                                (Array.isArray(errorData.message) ? errorData.message.join(', ') : '') ||
                                errorData.statusCode || 
                                'Failed to report alert. Please try again.';
            
            if (response.status === 400 && errorMessage && 
                (errorMessage.toLowerCase().includes('already reported') || errorMessage.includes('already reported'))) {
              showNotification('You have already reported this alert.', 'warning');
              // Don't throw error for already reported - this is expected behavior
              return;
            } else {
              showNotification(errorMessage, 'error');
              throw new Error(errorMessage);
            }
          }
        } catch (apiError) {
          console.error('❌ Failed to report alert to backend:', apiError);
          const isAlreadyReported = apiError instanceof Error && 
            (apiError.message.toLowerCase().includes('already reported') || apiError.message.includes('already reported'));
          
          if (!isAlreadyReported) {
            showNotification('Failed to report alert. Please try again.', 'error');
          } else {
            showNotification('You have already reported this alert.', 'warning');
          }
          
          // Don't throw for already reported - it's expected
          if (!isAlreadyReported) {
            throw apiError;
          }
        }
      } else {
        showNotification('Cannot report alert while offline. Please connect to the internet.', 'warning');
      }
    } catch (error) {
      console.error('❌ Failed to report alert:', error);
      showNotification('Failed to report alert. Please try again.', 'error');
      throw error;
    }
  }, [fetchAlerts, isOnline, token, user, showNotification]);

  const deleteAlert = useCallback(async (alertId: string) => {
    if (!token) {
      throw new Error('User not authenticated.');
    }

    // Find alert in current list for confirmation message
    const alertDoc = alerts.find(a => a._id === alertId);
    
    // Show custom confirmation modal
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Alert',
      message: alertDoc 
        ? `Are you sure you want to delete this alert?\n\nTitle: ${alertDoc.title}\nDescription: ${alertDoc.description}\nCreated by: ${alertDoc.username}`
        : `Are you sure you want to delete this alert?`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            showNotification('Alert deleted successfully!', 'success');
            await fetchAlerts();
          } else if (response.status === 404) {
            showNotification('Alert not found.', 'info');
            await fetchAlerts();
          } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to delete alert');
          }
        } catch (error) {
          console.error('❌ DELETE ERROR: Failed to delete alert:', error);
          showNotification('Failed to delete alert. Please try again.', 'error');
        }
      }
    });
  }, [token, alerts, fetchAlerts, showNotification]);

  const manualSyncAlerts = useCallback(async () => {
    setSyncAlertsStatus('syncing');
    try {
      // Just refresh alerts from server
      await fetchAlerts();
      setSyncAlertsStatus('idle');
    } catch (error) {
      console.error('❌ Manual alerts sync failed:', error);
      setSyncAlertsStatus('error');
    }
  }, [fetchAlerts]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && token) {
      manualSyncAlerts();
    }
  }, [isOnline, token, manualSyncAlerts]);

  const addComment = useCallback(async (alertId: string, comment: string) => {
    if (!token || !user?.id) {
      throw new Error('User not authenticated.');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Comment added successfully:', result);
        showNotification('Comment added successfully!', 'success');
        
        // Refresh alerts to show the updated comment
        await fetchAlerts();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add comment');
      }
    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      showNotification('Failed to add comment. Please try again.', 'error');
      throw error;
    }
  }, [token, user, fetchAlerts, showNotification]);

  const updateComment = useCallback(async (alertId: string, commentIndex: number, comment: string) => {
    if (!token || !user?.id) {
      throw new Error('User not authenticated.');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}/comment/${commentIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Comment updated successfully:', result);
        showNotification('Comment updated successfully!', 'success');
        await fetchAlerts();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update comment');
      }
    } catch (error) {
      console.error('❌ Failed to update comment:', error);
      showNotification('Failed to update comment. Please try again.', 'error');
      throw error;
    }
  }, [token, user, fetchAlerts, showNotification]);

  const deleteComment = useCallback(async (alertId: string, commentIndex: number) => {
    if (!token || !user?.id) {
      throw new Error('User not authenticated.');
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/alerts/${alertId}/comment/${commentIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Comment deleted successfully:', result);
        showNotification('Comment deleted successfully!', 'success');
        await fetchAlerts();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('❌ Failed to delete comment:', error);
      showNotification('Failed to delete comment. Please try again.', 'error');
      throw error;
    }
  }, [token, user, fetchAlerts, showNotification]);

  // Function to clear old data - no longer needed with REST API only
  const clearOldData = useCallback(async () => {
    showNotification('No local data to clear - using REST API only', 'info');
    setDbError(null);
  }, [showNotification]);

  const value: AlertsContextType = {
        alerts,
        createAlert,
        updateAlert,
        reportAlert,
        addComment,
        updateComment,
        deleteComment,
        deleteAlert,
        isLoadingAlerts,
        syncAlertsStatus,
        filterCategory,
        setFilterCategory,
        filterSeverity,
        setFilterSeverity,
        mapBounds,
        setMapBounds,
        manualSyncAlerts,
    showNotification,
    clearOldData,
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
      {dbError && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-50 max-w-md">
          <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold mb-1">Storage Error</h3>
                <p className="text-sm mb-3">{dbError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={clearOldData}
                    className="px-3 py-1 bg-white text-red-600 rounded text-sm font-medium hover:bg-gray-100"
                  >
                    Clear Old Data
                  </button>
                  <button
                    onClick={() => setDbError(null)}
                    className="px-3 py-1 bg-red-700 text-white rounded text-sm font-medium hover:bg-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <NotificationToast
        isOpen={notificationToast.isOpen}
        onClose={() => setNotificationToast(prev => ({ ...prev, isOpen: false }))}
        message={notificationToast.message}
        type={notificationToast.type}
        duration={5000}
      />
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};