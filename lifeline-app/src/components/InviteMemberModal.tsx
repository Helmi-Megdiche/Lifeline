'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { API_CONFIG } from '@/lib/config';
import { useAuth } from '@/contexts/ClientAuthContext';

interface User {
  id: string;
  username: string;
  email?: string;
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userId: string) => Promise<void>;
  existingMemberIds: string[];
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  existingMemberIds
}: InviteMemberModalProps) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setError(null);
      return;
    }

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Skip search if query is too short
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(
          `${API_CONFIG.BASE_URL}/auth/search?query=${encodeURIComponent(searchQuery.trim())}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to search users');
        }

        const data = await response.json();
        // Filter out users who are already members
        const filteredUsers = (data.users || []).filter(
          (user: User) => !existingMemberIds.includes(user.id)
        );
        setSearchResults(filteredUsers);
        setError(null);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, token, existingMemberIds, isOpen]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    setIsInviting(true);
    setError(null);

    try {
      await onInvite(selectedUser.id);
      onClose();
      setSelectedUser(null);
      setSearchQuery('');
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`
          relative w-full max-w-lg mx-auto rounded-2xl shadow-2xl
          ${theme === 'dark' 
            ? 'bg-dark-surface-primary/95 border border-dark-border-primary' 
            : 'bg-white/95 border border-gray-200/60'
          }
          backdrop-blur-xl transform transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200/60 dark:border-dark-border-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">👤</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Invite Member
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-secondary transition-all duration-200"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Search Input */}
          {!selectedUser ? (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or email..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-dark-surface-primary border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                  autoFocus
                />
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary py-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching users...</span>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border-2 border-gray-200/60 dark:border-dark-border-primary bg-white/80 dark:bg-dark-surface-primary shadow-sm">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-4 py-3.5 text-left hover:bg-blue-50 dark:hover:bg-dark-surface-secondary transition-colors border-b border-gray-200/60 dark:border-dark-border-primary last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                            {user.username}
                          </div>
                          {user.email && (
                            <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                              {user.email}
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 dark:text-dark-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="mt-3 p-6 text-center rounded-xl bg-gray-50/50 dark:bg-dark-surface-secondary/50 border border-gray-200/60 dark:border-dark-border-primary">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                    No users found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                    Try a different search term
                  </p>
                </div>
              )}

              {/* Hint */}
              {!searchQuery && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-tertiary bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <span>💡</span>
                  <span>Type at least 2 characters to search for users</span>
                </div>
              )}
            </div>
          ) : (
            /* Selected User */
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800/50 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                      {selectedUser.username}
                    </div>
                    {selectedUser.email && (
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary truncate mt-0.5">
                        {selectedUser.email}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                  className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-dark-surface-secondary transition-all duration-200 flex-shrink-0"
                  aria-label="Clear selection"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-l-4 border-red-500 dark:border-red-700 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 mt-6 border-t border-gray-200/60 dark:border-dark-border-primary">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-3 bg-gray-100 dark:bg-dark-surface-secondary hover:bg-gray-200 dark:hover:bg-dark-surface-tertiary text-gray-700 dark:text-dark-text-secondary font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={!selectedUser || isInviting}
              className="group flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-[1.02] disabled:transform-none flex items-center justify-center gap-2"
            >
              {isInviting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Inviting...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">✉️</span>
                  <span>Send Invite</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

