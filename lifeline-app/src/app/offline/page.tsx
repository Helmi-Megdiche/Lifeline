"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function OfflineModePage() {
  const { user, isOnline } = useAuth();
  const { theme } = useTheme();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load contacts from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('lifeline:contacts');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setContacts(data);
      } catch (error) {
        console.error('Failed to parse cached contacts:', error);
      }
    }
  }, []);

  const handleCallContact = (phone: string) => {
    try {
      window.location.href = `tel:${phone}`;
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(phone).then(() => {
        alert(`Phone number copied to clipboard: ${phone}`);
      });
    }
  };

  // Redirect to home if online
  useEffect(() => {
    if (!isOffline && navigator.onLine) {
      // User is back online, but don't auto-redirect - let them stay if they want
    }
  }, [isOffline]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className={`rounded-xl shadow-lg p-6 mb-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                📵 Offline Mode
              </h1>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Access your emergency contacts even without internet connection
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isOffline
                ? theme === 'dark'
                  ? 'bg-orange-900/30 border border-orange-700'
                  : 'bg-orange-50 border border-orange-200'
                : theme === 'dark'
                  ? 'bg-green-900/30 border border-green-700'
                  : 'bg-green-50 border border-green-200'
            }`}>
              <span className={`text-sm font-semibold ${
                isOffline
                  ? theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
                  : theme === 'dark' ? 'text-green-300' : 'text-green-800'
              }`}>
                {isOffline ? '⚫ Offline' : '🟢 Online'}
              </span>
            </div>
          </div>

          {!isOffline && (
            <div className={`mt-4 p-3 rounded-lg ${
              theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>
                ✅ You're back online! Your contacts will sync automatically.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              ← Back to Home
            </Link>
            <Link
              href="/alerts"
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              View Alerts
            </Link>
          </div>
        </div>

        {/* Emergency Contacts Panel */}
        <div className={`rounded-xl shadow-lg p-4 sm:p-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              📞 Emergency Contacts
            </h2>
            <Link
              href="/groups"
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Manage Contacts
            </Link>
          </div>

          {isOffline && (
            <div className={`mb-4 p-3 rounded-lg ${
              theme === 'dark' ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'
            }`}>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
              }`}>
                ⚠️ You're offline. Contacts are stored locally and will sync when you're back online.
              </p>
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className={`mb-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No emergency contacts yet. Add contacts in the Socialize page.
              </p>
              <Link
                href="/groups"
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Go to Socialize →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact._id}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className={`font-semibold text-lg ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {contact.name}
                        </h3>
                      </div>
                      <p className={`text-sm font-mono mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        📱 {contact.phone}
                      </p>
                      {contact.email && (
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ✉️ {contact.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleCallContact(contact.phone)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          theme === 'dark'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        title="Call"
                      >
                        📞 Call
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className={`mt-6 rounded-xl shadow-lg p-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ℹ️ About Offline Mode
          </h2>
          <div className={`space-y-3 text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <p>
              • <strong>Local Storage:</strong> Your emergency contacts from the Socialize page are stored locally for offline access.
            </p>
            <p>
              • <strong>Auto-Sync:</strong> When you're back online, your contacts automatically sync with the server.
            </p>
            <p>
              • <strong>Manage Contacts:</strong> Add, edit, or delete contacts in the <Link href="/groups" className="text-blue-600 dark:text-blue-400 underline">Socialize page</Link>.
            </p>
            <p>
              • <strong>Calling:</strong> Tap the "Call" button to open your phone's dialer.
            </p>
            <p>
              • <strong>Notifications:</strong> These contacts also receive emergency alerts via email when you create alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

