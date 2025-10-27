"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import { useSync } from '@/components/ClientSyncProvider';
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';
import ConfirmationModal from '@/components/ConfirmationModal';
import NotificationToast from '@/components/NotificationToast';

// Load the find plugin
PouchDB.plugin(PouchFind);

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
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token, isAuthenticated, isOnline } = useAuth();

  // Note: Removed global error suppression as it wasn't effective
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [syncAlertsStatus, setSyncAlertsStatus] = useState('idle');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{ north: number; east: number; south: number; west: number } | null>(null);
  const [remoteAlertsDB, setRemoteAlertsDB] = useState<any>(null);
  
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

  // Create local database using useMemo for stability
  // Reset when user changes to prevent data conflicts
  const localDB = useMemo(() => {
    return new PouchDB('lifeline-alerts');
  }, [user?.id]); // Recreate database when user changes

  // Build an authed fetch that refreshes headers per call
  const authedFetch = useCallback((url: any, opts: any = {}) => {
    // Always ensure the URL is correct for alerts (but exclude DELETE requests and direct /alerts endpoint)
    if (typeof url === 'string' && url.includes('/alerts/') && !url.includes('/alerts/pouch/') && opts.method !== 'DELETE' && !url.endsWith('/alerts')) {
      url = url.replace('/alerts/', '/alerts/pouch/');
    }
    
    if (!token) {
      return Promise.reject(new Error('No authentication token available'));
    }
    
    const headers = new Headers(opts.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // timestamp busting
    const urlWithTs = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    
    return (PouchDB as any).fetch(urlWithTs, { ...opts, headers }).then((response: any) => {
      if (!response.ok) {
        // Don't log 404s for _local documents (PouchDB replication checkpoints)
        const isLocalDocument = typeof url === 'string' && url.includes('/_local/');
        const isExpected404 = response.status === 404 && isLocalDocument;
        
        if (!isExpected404) {
          console.error('❌ Fetch error:', response.status, response.statusText, 'for URL:', url);
        }
        // Completely silence expected 404s for _local documents
      }
      return response;
    }).catch((error: any) => {
      // Also filter catch errors for _local documents
      const isLocalDocument = typeof url === 'string' && url.includes('/_local/');
      if (!isLocalDocument) {
        console.error('🚨 Fetch error:', error);
      }
      // Completely silence expected errors for _local documents
      throw error;
    });
  }, [token]);

  // Create indexes for efficient querying
  useEffect(() => {
    const createIndexes = async () => {
      try {
        await localDB.createIndex({ index: { fields: ['userId'] } });
        await localDB.createIndex({ index: { fields: ['createdAt'] } });
        await localDB.createIndex({ index: { fields: ['category'] } });
        await localDB.createIndex({ index: { fields: ['severity'] } });
        await localDB.createIndex({ index: { fields: ['expiresAt'] } });
        await localDB.createIndex({ index: { fields: ['status'] } });
        await localDB.createIndex({ index: { fields: ['hidden'] } });
        await localDB.createIndex({ index: { fields: ['reportCount'] } });
        await localDB.createIndex({ index: { fields: ['dedupHash'] } });
        await localDB.createIndex({ index: { fields: ['location.lat', 'location.lng'] } });
        // Legacy indexes for backward compatibility
        await localDB.createIndex({ index: { fields: ['timestamp'] } });
        await localDB.createIndex({ index: { fields: ['deDupHash'] } });
        await localDB.createIndex({ index: { fields: ['roundedLatitude', 'roundedLongitude'] } });
      } catch (indexError) {
        // Index creation failed (may already exist)
      }
    };
    
    createIndexes();
  }, [localDB]);

  // Sync reference for cleanup
  const syncRef = useRef<any>(null);

  // Main replication effect
  useEffect(() => {
    // Check if we have all required dependencies
    if (!token || !user?.id || !isAuthenticated || !localDB) {
      return;
    }
    
    const REMOTE_URL = `${API_CONFIG.BASE_URL}/alerts/pouch`;
    
    // Create remote database with authed fetch
    const remote: any = new PouchDB(REMOTE_URL, {
      skip_setup: true,
      fetch: authedFetch,
    });

    // Store remote DB in state for use in createAlert
    setRemoteAlertsDB(remote);

    // Cancel old sync if any
    if (syncRef.current) {
      syncRef.current.cancel();
    }

    // Wrap the async operations in an async function
    const setupReplication = async () => {
      try {
        try {
          await remote.info();
        } catch (error) {
          throw error;
        }
        
        // Start bidirectional sync
        const pull = localDB.replicate.from(remote, {
          live: true,
          retry: true,
          heartbeat: 30000,
          back_off_function: (delay: number) => (delay === 0 ? 2000 : Math.min(delay * 2, 30000)),
        });

        const push = localDB.replicate.to(remote, {
          live: true,
          retry: true,
          heartbeat: 30000,
          back_off_function: (delay: number) => (delay === 0 ? 2000 : Math.min(delay * 2, 30000)),
        });

        // Store sync references for cleanup
        syncRef.current = {
          cancel: () => {
            // Don't explicitly cancel - let PouchDB handle cleanup naturally
            // This avoids AbortError issues during component unmount
          }
        };

        // Set up event handlers for pull
        pull
          .on('change', (info: any) => {
            setSyncAlertsStatus('syncing');
            fetchAlerts();
          })
          .on('error', (err: any) => {
            console.error('❌ PULL ERROR:', err);
            setSyncAlertsStatus('error');
          });

        // Set up event handlers for push
        push
          .on('change', (info: any) => {
            setSyncAlertsStatus('syncing');
            fetchAlerts();
          })
          .on('error', (err: any) => {
            console.error('❌ PUSH ERROR:', err);
            setSyncAlertsStatus('error');
          });


      } catch (error: any) {
        console.error('❌ REPLICATION SETUP FAILED:', error.message);
        setSyncAlertsStatus('error');
      }
    };

    // Call the async function
    setupReplication();

    // Cleanup function
    return () => {
      if (syncRef.current) {
        try {
          syncRef.current.cancel();
        } catch (error: any) {
          // Ignore AbortError during cleanup
          if (error.name !== 'AbortError') {
            console.warn('⚠️ Error during replication cleanup:', error);
          }
        }
        syncRef.current = null;
      }
    };
  }, [token, user?.id, isAuthenticated, authedFetch, localDB]);

  const fetchAlerts = useCallback(async () => {
    if (!localDB) return;

    try {
      setIsLoadingAlerts(true);

      // Build selector based on filters
      const selector: any = {
        // Removed userId filter to show all alerts from all users
        expiresAt: { $gt: new Date().toISOString() },
        status: 'active',
        hidden: { $ne: true },
      };

      if (filterCategory) {
        selector.category = filterCategory;
      }

      if (filterSeverity) {
        selector.severity = filterSeverity;
      }

      if (mapBounds) {
        selector.$or = [
          {
            'location.lat': { $gte: mapBounds.south, $lte: mapBounds.north },
            'location.lng': { $gte: mapBounds.west, $lte: mapBounds.east },
          },
          {
            latitude: { $gte: mapBounds.south, $lte: mapBounds.north },
            longitude: { $gte: mapBounds.west, $lte: mapBounds.east },
          },
        ];
      }

      // Query local database
      const result = await localDB.find({
        selector,
        limit: 1000,
      });

      const localAlerts = result.docs as Alert[];
      
      // Also fetch from direct API endpoint to ensure we have all alerts
      let apiAlerts: Alert[] = [];
      if (isOnline && token) {
        try {
          // Build query parameters for the API call
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
            }
          });
          
          console.log('📡 API Response status:', response.status, response.statusText);
          
          if (response.ok) {
            const apiData = await response.json();
            apiAlerts = apiData.alerts || [];
            console.log('✅ API alerts fetched:', apiAlerts.length, 'alerts');
          } else {
            console.error('❌ API fetch failed:', response.status, response.statusText);
          }
        } catch (apiError) {
          console.error('❌ Failed to fetch alerts from API:', apiError);
        }
      }

      // Merge local and API alerts, removing duplicates
      const allAlerts = [...localAlerts];
      apiAlerts.forEach(apiAlert => {
        const exists = allAlerts.some(localAlert => localAlert._id === apiAlert._id);
        if (!exists) {
          allAlerts.push(apiAlert);
        }
      });

      // Sort by createdAt after fetching
      const sortedAlerts = allAlerts.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setAlerts(sortedAlerts as Alert[]);
    } catch (error) {
      console.error('❌ Failed to fetch alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [localDB, user?.id, filterCategory, filterSeverity, mapBounds, isOnline, token, authedFetch]);

  // Fetch alerts when filters change
  useEffect(() => {
    if (localDB && user?.id) {
          fetchAlerts();
        }
  }, [fetchAlerts]);

  // Periodic refresh of alerts when online
  useEffect(() => {
    if (!isOnline || !localDB || !user?.id) return;

    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Refresh every 30 seconds when online

    return () => clearInterval(interval);
  }, [isOnline, localDB, user?.id, fetchAlerts]);

  const createAlert = useCallback(async (payload: CreateAlertPayload) => {
    if (!localDB || !user?.id || !user?.username) {
      throw new Error('User not authenticated or PouchDB not initialized.');
    }

    const now = new Date().toISOString();
    const ttlHours = payload.ttlHours || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    // Normalize coordinates from either payload.latitude/longitude or payload.location
    const latitude = typeof payload.latitude === 'number' ? payload.latitude : payload.location?.lat;
    const longitude = typeof payload.longitude === 'number' ? payload.longitude : payload.location?.lng;

    if (latitude == null || longitude == null) {
      throw new Error('Missing coordinates for alert (latitude/longitude).');
    }

    // Round coordinates for deduplication (to ~100m precision)
    const roundedLatitude = Math.round(latitude * 1000) / 1000;
    const roundedLongitude = Math.round(longitude * 1000) / 1000;

    // Create deduplication hash
    const dedupHash = `${roundedLatitude},${roundedLongitude},${payload.category},${payload.severity}`;

    const alert: Alert = {
      _id: generateUUID(),
      userId: user.id,
      username: user.username,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      location: {
        lat: latitude,
        lng: longitude,
        address: payload.location?.address,
      },
      severity: payload.severity,
      status: 'active',
      reportCount: 1,
      reportedBy: [user.id],
      dedupHash,
      createdAt: now,
      expiresAt,
      synced: isOnline,
      hidden: false,
      // Legacy fields for backward compatibility
      latitude,
      longitude,
      timestamp: Date.now(),
      deDupHash: dedupHash,
      roundedLatitude,
      roundedLongitude,
      offlineCreated: !isOnline,
    };

    try {
      await localDB.put(alert);
      
      // Refresh alerts list
      await fetchAlerts();
      
      // Trigger manual sync if online
      if (isOnline) {
        try {
          // Use direct _bulk_docs call instead of PouchDB replication
          const REMOTE_URL = `${API_CONFIG.BASE_URL}/alerts/pouch`;
          const response = await authedFetch(`${REMOTE_URL}/_bulk_docs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              docs: [alert]
            })
          });
          
          if (!response.ok) {
            console.error('❌ Failed to sync alert via _bulk_docs:', response.status, response.statusText);
          }
        } catch (syncError) {
          console.error('❌ Failed to sync alert:', syncError);
        }
      }
    } catch (error) {
      console.error('❌ Failed to create alert:', error);
      throw error;
    }
  }, [localDB, user, isOnline, fetchAlerts, authedFetch]);

  const updateAlert = useCallback(async (alertId: string, payload: Partial<CreateAlertPayload>) => {
    if (!localDB || !user?.id) {
      throw new Error('User not authenticated or PouchDB not initialized.');
    }

    try {
      // Get the existing alert
      const existingAlert = await localDB.get(alertId) as Alert;
      
      // Update fields based on payload
      if (payload.title !== undefined) {
        existingAlert.title = payload.title;
      }
      if (payload.description !== undefined) {
        existingAlert.description = payload.description;
      }
      if (payload.category !== undefined) {
        existingAlert.category = payload.category;
      }
      if (payload.severity !== undefined) {
        existingAlert.severity = payload.severity;
      }
      
      // Update location if provided
      if (payload.location) {
        existingAlert.location = {
          lat: payload.location.lat,
          lng: payload.location.lng,
          address: payload.location.address
        };
      } else if (payload.latitude !== undefined && payload.longitude !== undefined) {
        existingAlert.location = {
          lat: payload.latitude,
          lng: payload.longitude
        };
      }

      // Save updated alert
      await localDB.put(existingAlert);
      
      // Refresh alerts list
      await fetchAlerts();
      
      // Show success notification
      showNotification('Alert updated successfully!', 'success');
    } catch (error) {
      console.error('❌ Failed to update alert:', error);
      showNotification('Failed to update alert. Please try again.', 'error');
      throw error;
    }
  }, [localDB, user, fetchAlerts, showNotification]);

  const reportAlert = useCallback(async (alertId: string) => {
    if (!localDB) {
      throw new Error('PouchDB not initialized.');
    }

    try {
      // Check locally first to prevent unnecessary API calls
      const localAlert = await localDB.get(alertId) as Alert;
      if (localAlert.reportedBy?.includes(user?.id || '')) {
        showNotification('You have already reported this alert.', 'warning');
        return;
      }
    } catch (localError) {
      // If we can't get the local alert, continue with API call
      console.log('Could not check local alert, proceeding with API call');
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
            
            // Update local database with the server's response
            if (result.alert) {
              try {
                await localDB.put(result.alert);
              } catch (putError: any) {
                // If update fails due to conflict, it's okay - sync will fix it
                if (putError.status !== 409) {
                  console.error('Failed to update local alert:', putError);
                }
              }
            }
            
            showNotification('Alert reported successfully!', 'success');
            // Refresh alerts to get updated count
            await fetchAlerts();
          } else {
            let errorData: any = { message: 'Unknown error' };
            
            // Try to parse error response
            try {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
              } else {
                const text = await response.text();
                errorData = text ? { message: text } : { message: `Backend returned ${response.status}` };
              }
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
              errorData = { message: `Backend returned ${response.status}` };
            }
            
            console.error('❌ Backend error:', errorData);
            
            // Handle specific error messages
            const errorMessage = errorData.message || errorData.error || 'Failed to report alert. Please try again.';
            if (response.status === 400 && errorMessage.toLowerCase().includes('already reported')) {
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
        // Offline mode: increment local count
        const alert = await localDB.get(alertId) as Alert;
        if (!alert.reportedBy) {
          alert.reportedBy = [];
        }
        
        // Check if user already reported locally
        if (!alert.reportedBy.includes(user?.id || '')) {
          alert.reportedBy.push(user?.id || '');
          alert.reportCount = alert.reportedBy.length;
          
          await localDB.put(alert);
          console.log('✅ Alert report count updated locally (offline mode)');
          
          // Refresh alerts list
          await fetchAlerts();
        } else {
          showNotification('You have already reported this alert.', 'warning');
        }
      }
    } catch (error) {
      console.error('❌ Failed to report alert:', error);
      showNotification('Failed to report alert. Please try again.', 'error');
      throw error;
    }
  }, [localDB, fetchAlerts, isOnline, token, user, showNotification]);

  const deleteAlert = useCallback(async (alertId: string) => {
    if (!localDB) {
      throw new Error('PouchDB not initialized.');
    }

    // Check if app is online before allowing deletion
    if (!isOnline) {
      showNotification('Cannot delete alerts while offline. Please connect to the internet and try again.', 'warning');
      return;
    }

    try {
      // Get alert details for confirmation
      const alertDoc = await localDB.get(alertId) as Alert;
      if (!alertDoc._rev) {
        throw new Error('Alert revision not found');
      }
      
      // Show custom confirmation modal
      setConfirmationModal({
        isOpen: true,
        title: 'Delete Alert',
        message: `Are you sure you want to delete this alert?\n\nTitle: ${alertDoc.title}\nDescription: ${alertDoc.description}\nCreated by: ${alertDoc.username}`,
        type: 'danger',
        onConfirm: async () => {
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          
          
          // Delete from local PouchDB first
          if (!alertDoc._rev) {
            throw new Error('Alert revision not found');
          }
          await localDB.remove(alertDoc._id, alertDoc._rev);
          
          // Since we already checked isOnline, proceed with server deletion
          console.log('🔄 Syncing deletion to server...');
          try {
            const REMOTE_URL = `${API_CONFIG.BASE_URL}/alerts/${alertId}`;
            const response = await authedFetch(REMOTE_URL, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok) {
              // Show success message to user
              showNotification('Alert deleted successfully!', 'success');
            } else {
              console.error('❌ DELETE FAILED: Failed to delete alert from server:', response.status, response.statusText);
              // Show warning to user
              showNotification('Warning: Alert was removed from your view but may still exist on the server. Please try again.', 'warning');
            }
          } catch (syncError) {
            console.error('❌ DELETE ERROR: Failed to sync deletion to server:', syncError);
            // Show warning to user
            showNotification('Warning: Alert was removed from your view but may still exist on the server. Please try again.', 'warning');
          }
          
          // Refresh alerts list
          await fetchAlerts();
        }
      });
      
    } catch (error) {
      console.error('❌ DELETE FAILED: Failed to delete alert:', error);
      console.error('🚨 ERROR DETAILS:', JSON.stringify(error, null, 2));
      // Show error message to user
      showNotification('Failed to delete alert. Please try again.', 'error');
      throw error;
    }
  }, [localDB, fetchAlerts, isOnline, authedFetch, showNotification]);

  const manualSyncAlerts = useCallback(async () => {
    if (!localDB) {
      setSyncAlertsStatus('error');
      return;
    }
    
    setSyncAlertsStatus('syncing');
    
    try {
      // Get all unsynced alerts from local database
      const result = await localDB.find({
        selector: { synced: false },
        fields: ['_id', '_rev', 'title', 'description', 'category', 'severity', 'location', 'userId', 'username', 'createdAt', 'expiresAt', 'offlineCreated']
      });
      
      const unsyncedAlerts = result.docs;
      
      if (unsyncedAlerts.length === 0) {
        setSyncAlertsStatus('idle');
        return;
      }

      // Use direct _bulk_docs call to sync alerts
      const REMOTE_URL = `${API_CONFIG.BASE_URL}/alerts/pouch`;
      const response = await authedFetch(`${REMOTE_URL}/_bulk_docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docs: unsyncedAlerts
        })
      });
      
      if (response.ok) {
        const syncResults = await response.json();
        
        // Update local alerts to mark them as synced
        for (let i = 0; i < unsyncedAlerts.length; i++) {
          const alert = unsyncedAlerts[i];
          const result = syncResults[i];
          
          if (result.ok) {
            // Update the alert to mark it as synced
            await localDB.put({
              ...alert,
              synced: true,
              _rev: result.rev
            });
          } else {
            console.error(`❌ Failed to sync alert ${alert._id}:`, result.error);
          }
        }
        
        setSyncAlertsStatus('idle');
        
        // Refresh alerts list
      await fetchAlerts();
      } else {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Manual alerts sync failed:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      setSyncAlertsStatus('error');
    }
  }, [localDB, fetchAlerts, authedFetch]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && localDB) {
      
      // Check if there are any unsynced alerts and sync them
      localDB.find({
        selector: { synced: false },
        fields: ['_id']
      }).then(result => {
        if (result.docs.length > 0) {
          manualSyncAlerts();
        }
      }).catch(error => {
        console.error('❌ Error checking for unsynced alerts:', error);
      });
    }
  }, [isOnline, localDB, manualSyncAlerts]);

  const value: AlertsContextType = {
        alerts,
        createAlert,
        updateAlert,
        reportAlert,
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
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
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