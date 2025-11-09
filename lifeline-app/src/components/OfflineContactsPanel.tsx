"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useOfflineContacts } from '@/hooks/useOfflineContacts';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationToast from './NotificationToast';

export default function OfflineContactsPanel() {
  const { contacts, addContact, updateContact, deleteContact, isOffline, showToast, toastMessage } = useOfflineContacts();
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', relationship: '' });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const menuRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.values(menuRef.current).forEach(menu => {
        if (menu && !menu.contains(event.target as Node)) {
          // Close menu logic would go here if needed
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCall = async (phone: string) => {
    try {
      // Try to open native dialer
      window.location.href = `tel:${phone}`;
    } catch (error) {
      // Fallback: copy to clipboard
      await handleCopyPhone(phone);
    }
  };

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopySuccess(phone);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy phone:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }

    if (editingId) {
      updateContact(editingId, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        relationship: formData.relationship.trim() || undefined,
      });
      setEditingId(null);
    } else {
      addContact({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        relationship: formData.relationship.trim() || undefined,
      });
    }

    setFormData({ name: '', phone: '', relationship: '' });
    setShowAddModal(false);
  };

  const handleEdit = (contact: typeof contacts[0]) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteContact(id);
    }
  };

  return (
    <>
      <div className={`rounded-xl shadow-lg p-4 sm:p-6 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            📞 Emergency Contacts
          </h2>
          {contacts.length < 5 && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', phone: '', relationship: '' });
                setShowAddModal(true);
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              + Add Contact
            </button>
          )}
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
              No emergency contacts yet. Add up to 5 trusted contacts for quick access.
            </p>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', phone: '', relationship: '' });
                setShowAddModal(true);
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              + Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {contact.name}
                    </h3>
                    {contact.relationship && (
                      <p className={`text-sm mb-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {contact.relationship}
                      </p>
                    )}
                    <p className={`text-sm font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {contact.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleCall(contact.phone)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        theme === 'dark'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title="Call"
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() => handleCopyPhone(contact.phone)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-600 hover:bg-gray-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title="Copy Phone"
                    >
                      {copySuccess === contact.phone ? '✓' : '📋'}
                    </button>
                    <div className="relative" ref={el => menuRef.current[contact.id] = el}>
                      <button
                        onClick={() => {
                          // Toggle menu or show edit/delete options
                          handleEdit(contact);
                        }}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                          theme === 'dark'
                            ? 'bg-gray-600 hover:bg-gray-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        title="Edit"
                      >
                        ✏️
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                        theme === 'dark'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contacts.length >= 5 && (
          <p className={`mt-4 text-sm text-center ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Maximum of 5 contacts reached
          </p>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => {
            setShowAddModal(false);
            setEditingId(null);
            setFormData({ name: '', phone: '', relationship: '' });
          }}
        >
          <div
            className={`rounded-2xl shadow-2xl p-6 w-full max-w-md ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {editingId ? 'Edit Contact' : 'Add Emergency Contact'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="+1234567890"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Relationship (Optional)
                </label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Family, Friend, Doctor, etc."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({ name: '', phone: '', relationship: '' });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showToast && (
        <NotificationToast
          message={toastMessage}
          type={toastMessage.includes('✅') ? 'success' : 'error'}
          onClose={() => {}}
        />
      )}
    </>
  );
}

