'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import { offlineSyncManager, groupsCache } from '@/lib/offline-sync';
import { Group, CreateGroupDto, UpdateGroupDto, UserStatus, GroupMember, AddMemberDto } from '@/types/group';

interface GroupsContextType {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  createGroup: (data: CreateGroupDto) => Promise<Group>;
  updateGroup: (id: string, data: UpdateGroupDto) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  updateStatus: (groupId: string, status: UserStatus) => Promise<void>;
  refreshGroups: () => Promise<void>;
  syncPendingActions: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export const GroupsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups from API with caching
  const fetchGroups = useCallback(async () => {
    if (!user || !token) {
      setGroups([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      if (navigator.onLine && token) {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/groups`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setGroups(data);
            // Cache the groups
            await groupsCache.cacheGroups(data);
          } else {
            throw new Error('Failed to fetch groups');
          }
        } catch (apiError) {
          console.error('Failed to fetch from API, using cache:', apiError);
          // Fallback to cache
          const cachedGroups = await groupsCache.getCachedGroups();
          if (cachedGroups.length > 0) {
            setGroups(cachedGroups);
          }
        }
      } else {
        // Offline mode - use cache
        const cachedGroups = await groupsCache.getCachedGroups();
        setGroups(cachedGroups);
      }
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // Create group
  const createGroup = useCallback(async (data: CreateGroupDto): Promise<Group> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const newGroup = await response.json();
          setGroups(prev => [...prev, newGroup]);
          // Cache the new group
          await groupsCache.getCachedGroups().then(groups => {
            groups.push(newGroup);
            groupsCache.cacheGroups(groups);
          });
          return newGroup;
        } else {
          // If online but request fails, queue for retry
          await offlineSyncManager.addPendingAction({
            action: 'CREATE_GROUP',
            endpoint: '/groups',
            method: 'POST',
            data,
            timestamp: new Date().toISOString(),
          });
          throw new Error('Failed to create group. Will retry when online.');
        }
      } catch (error) {
        console.error('Failed to create group online:', error);
        // Add to pending actions
        await offlineSyncManager.addPendingAction({
          action: 'CREATE_GROUP',
          endpoint: '/groups',
          method: 'POST',
          data,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else {
      // Offline mode - add to pending actions and return a temporary group
      await offlineSyncManager.addPendingAction({
        action: 'CREATE_GROUP',
        endpoint: '/groups',
        method: 'POST',
        data,
        timestamp: new Date().toISOString(),
      });
      
      // Return a temporary group for UI purposes
      const tempGroup: Group = {
        _id: `temp-${Date.now()}`,
        name: data.name,
        ownerId: user.id,
        description: data.description,
        type: data.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memberCount: 1,
      };
      
      setGroups(prev => [...prev, tempGroup]);
      await groupsCache.cacheGroups([...groups, tempGroup]);
      
      return tempGroup;
    }
  }, [user, token, groups]);

  // Update group
  const updateGroup = useCallback(async (id: string, data: UpdateGroupDto): Promise<Group> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const updatedGroup = await response.json();
          setGroups(prev => prev.map(g => g._id === id ? updatedGroup : g));
          return updatedGroup;
        } else {
          throw new Error('Failed to update group');
        }
      } catch (error) {
        // Add to pending actions
        await offlineSyncManager.addPendingAction({
          action: 'UPDATE_GROUP',
          endpoint: `/groups/${id}`,
          method: 'PATCH',
          data,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else {
      // Add to pending actions
      await offlineSyncManager.addPendingAction({
        action: 'UPDATE_GROUP',
        endpoint: `/groups/${id}`,
        method: 'PATCH',
        data,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Cannot update group while offline. Action queued for sync.');
    }
  }, [user, token]);

  // Delete group
  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    // Remove from local state immediately (optimistic update)
    setGroups(prev => prev.filter(g => g._id !== id));
    
    // Also remove from cache
    try {
      const cachedGroups = await groupsCache.getCachedGroups();
      await groupsCache.cacheGroups(cachedGroups.filter(g => g._id !== id));
    } catch (error) {
      console.error('Failed to remove from cache:', error);
    }

    if (navigator.onLine && !id.startsWith('temp-')) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete group');
        }
      } catch (error) {
        // Add to pending actions if delete failed
        await offlineSyncManager.addPendingAction({
          action: 'DELETE_GROUP',
          endpoint: `/groups/${id}`,
          method: 'DELETE',
          data: {},
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else if (!navigator.onLine && !id.startsWith('temp-')) {
      // Offline deletion - queue for sync
      await offlineSyncManager.addPendingAction({
        action: 'DELETE_GROUP',
        endpoint: `/groups/${id}`,
        method: 'DELETE',
        data: {},
        timestamp: new Date().toISOString(),
      });
    }
    // For temp groups, just remove locally (they'll be created when online)
  }, [user, token]);

  // Add member
  const addMember = useCallback(async (groupId: string, userId: string): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to add member';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Use default message if JSON parsing fails
          }
          throw new Error(errorMessage);
        }

        // Refresh groups after successful invite
        await fetchGroups();
      } catch (error) {
        // Add to pending actions
        await offlineSyncManager.addPendingAction({
          action: 'ADD_MEMBER',
          endpoint: `/groups/${groupId}/members`,
          method: 'POST',
          data: { userId },
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else {
      // Add to pending actions
      await offlineSyncManager.addPendingAction({
        action: 'ADD_MEMBER',
        endpoint: `/groups/${groupId}/members`,
        method: 'POST',
        data: { userId },
        timestamp: new Date().toISOString(),
      });
      throw new Error('Cannot add member while offline. Action queued for sync.');
    }
  }, [user, token, fetchGroups]);

  // Remove member
  const removeMember = useCallback(async (groupId: string, userId: string): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/members/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to remove member');
        }
      } catch (error) {
        // Add to pending actions
        await offlineSyncManager.addPendingAction({
          action: 'REMOVE_MEMBER',
          endpoint: `/groups/${groupId}/members/${userId}`,
          method: 'DELETE',
          data: {},
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else {
      // Add to pending actions
      await offlineSyncManager.addPendingAction({
        action: 'REMOVE_MEMBER',
        endpoint: `/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
        data: {},
        timestamp: new Date().toISOString(),
      });
      throw new Error('Cannot remove member while offline. Action queued for sync.');
    }
  }, [user, token]);

  // Update status
  const updateStatus = useCallback(async (groupId: string, status: UserStatus): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/members/${user.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }
      } catch (error) {
        // Add to pending actions
        await offlineSyncManager.addPendingAction({
          action: 'UPDATE_STATUS',
          endpoint: `/groups/${groupId}/members/${user.id}/status`,
          method: 'PATCH',
          data: { status },
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    } else {
      // Add to pending actions
      await offlineSyncManager.addPendingAction({
        action: 'UPDATE_STATUS',
        endpoint: `/groups/${groupId}/members/${user.id}/status`,
        method: 'PATCH',
        data: { status },
        timestamp: new Date().toISOString(),
      });
      throw new Error('Cannot update status while offline. Action queued for sync.');
    }
  }, [user, token]);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    // Guard: Don't sync if no token or offline
    if (!token || !navigator.onLine) {
      return;
    }

    // Guard: Ensure API config is ready
    if (!API_CONFIG?.BASE_URL) {
      console.warn('⚠️ API config not ready - skipping sync');
      return;
    }

    try {
      const pendingActions = await offlineSyncManager.getPendingActions();
      
      // Skip if no pending actions
      if (pendingActions.length === 0) {
        return;
      }
      
      console.log(`🔄 Syncing ${pendingActions.length} pending action(s)...`);
      const totalActions = pendingActions.length;
      
      for (const action of pendingActions) {
        try {
          // For DELETE operations, we need to make sure the endpoint is correct
          const endpoint = action.method === 'DELETE' 
            ? `${API_CONFIG.BASE_URL}${action.endpoint}` 
            : `${API_CONFIG.BASE_URL}${action.endpoint}`;
          
          const response = await fetch(endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: ['POST', 'PUT', 'PATCH'].includes(action.method) ? JSON.stringify(action.data) : undefined,
          });

          if (response.ok) {
            await offlineSyncManager.markActionAsSynced(action.id);
            console.log('✅ Synced action:', action.action);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to sync action:', action.action, 'Status:', response.status, errorText);
            
            // If it's a permission error (403) or not found (404), remove from queue
            if (response.status === 403 || response.status === 404) {
              console.warn(`⚠️ ${response.status === 403 ? 'Permission denied' : 'Resource not found'} - removing action from queue`);
              await offlineSyncManager.markActionAsSynced(action.id);
            }
          }
        } catch (error: any) {
          // If it's a network error (Failed to fetch), don't mark as synced - retry later
          // Check for various network error patterns
          const isNetworkError = error instanceof TypeError && 
            (error.message?.includes('fetch') || 
             error.message?.includes('Failed to fetch') ||
             error.message?.includes('NetworkError') ||
             error.message?.includes('network'));
          
          if (isNetworkError) {
            // Silent retry - don't spam console on login when backend might not be ready
            // Network errors will be retried automatically, no need to log every attempt
            // Don't mark as synced - will retry later when connection is stable
            continue; // Skip to next action silently
          } else {
            console.error('❌ Failed to sync action:', action.action, error);
            // For other errors, mark as synced to avoid infinite retries
            await offlineSyncManager.markActionAsSynced(action.id);
          }
        }
      }

      // Clear old synced actions
      await offlineSyncManager.clearSyncedActions();
      
      // Refresh groups after sync to get real data and remove temp groups
      await fetchGroups();
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
    }
  }, [token, fetchGroups]);

  // Auto-sync when online
  useEffect(() => {
    if (navigator.onLine && token) {
      // Delay sync slightly after login so token/auth are fully ready
      // Also listen for online event
      const handleOnline = () => {
        if (token) {
          setTimeout(() => syncPendingActions(), 1000);
        }
      };
      
      const timer = setTimeout(() => {
        syncPendingActions();
      }, 2000); // Increased delay to ensure backend/auth fully ready
      
      window.addEventListener('online', handleOnline);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [navigator.onLine, token, syncPendingActions]);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Refresh groups
  const refreshGroups = useCallback(async () => {
    await fetchGroups();
  }, [fetchGroups]);

  const value: GroupsContextType = {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    updateStatus,
    refreshGroups,
    syncPendingActions,
  };

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
};

export const useGroups = () => {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
};

