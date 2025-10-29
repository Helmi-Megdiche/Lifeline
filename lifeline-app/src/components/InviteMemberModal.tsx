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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`
          relative w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl
          ${theme === 'dark' 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
          }
          transform transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`
            absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
          `}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h3 className={`
          text-xl font-semibold mb-4
          ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
        `}>
          Invite Member
        </h3>

        {/* Search Input */}
        {!selectedUser ? (
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className={`
                w-full px-4 py-2 rounded-lg border
                ${theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              autoFocus
            />

            {/* Loading indicator */}
            {isSearching && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Searching...
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={`
                mt-2 max-h-48 overflow-y-auto rounded-lg border
                ${theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-gray-300'
                }
              `}>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-600
                      transition-colors border-b last:border-b-0
                      ${theme === 'dark' 
                        ? 'border-gray-600' 
                        : 'border-gray-200'
                      }
                    `}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </div>
                    {user.email && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No users found
              </div>
            )}

            {/* Hint */}
            {!searchQuery && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        ) : (
          /* Selected User */
          <div className={`
            mb-4 p-4 rounded-lg border
            ${theme === 'dark' 
              ? 'bg-gray-700 border-gray-600' 
              : 'bg-gray-50 border-gray-300'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.username}
                </div>
                {selectedUser.email && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.email}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!selectedUser || isInviting}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              bg-blue-600 hover:bg-blue-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isInviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

