'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGroups } from '@/contexts/GroupsContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GroupType } from '@/types/group';
import { useAuth } from '@/contexts/ClientAuthContext';
import { API_CONFIG } from '@/lib/config';
import { useTheme } from '@/contexts/ThemeContext';

// Country codes with flags (emoji) and dial codes
const countries: Array<{ code: string; name: string; dialCode: string; flag: string }> = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', dialCode: '+385', flag: '🇭🇷' },
  { code: 'RS', name: 'Serbia', dialCode: '+381', flag: '🇷🇸' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '🇸🇮' },
  { code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', dialCode: '+371', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿' },
  { code: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪' },
  { code: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { code: 'SY', name: 'Syria', dialCode: '+963', flag: '🇸🇾' },
  { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function GroupsPage() {
  const { groups, isLoading, createGroup, deleteGroup, listMyInvitations, acceptInvitation, declineInvitation } = useGroups();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    type: GroupType.FAMILY,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ id: string; groupName?: string }[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const InvitationsModal = dynamic(() => import('./InvitationsModal'), { ssr: false });
  
  // Contacts state
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    methods: ['sms', 'whatsapp'] as string[],
  });
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; dialCode: string; flag: string; name: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    const loadInvites = async () => {
      setLoadingInvites(true);
      try {
        const res = await listMyInvitations();
        setInvites(res);
      } finally {
        setLoadingInvites(false);
      }
    };
    loadInvites();
  }, [listMyInvitations]);

  // Load contacts
  useEffect(() => {
    if (token && user) {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const loadContacts = async () => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const url = editingContact 
        ? `${API_CONFIG.BASE_URL}/contacts/${editingContact._id}`
        : `${API_CONFIG.BASE_URL}/contacts`;
      
      const method = editingContact ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        await loadContacts();
        setShowContactModal(false);
        setEditingContact(null);
        setContactForm({ name: '', phone: '', email: '', methods: ['sms', 'whatsapp'] });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save contact');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save contact');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadContacts();
      } else {
        alert('Failed to delete contact');
      }
    } catch (error) {
      alert('Failed to delete contact');
    }
  };

  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    const phone = contact.phone || '';
    
    // Try to detect country from phone number
    let detectedCountry = null;
    if (phone.startsWith('+')) {
      for (const country of countries) {
        if (phone.startsWith(country.dialCode)) {
          detectedCountry = country;
          break;
        }
      }
    }
    setSelectedCountry(detectedCountry);
    
    setContactForm({
      name: contact.name || '',
      phone: phone,
      email: contact.email || '',
      methods: contact.methods || ['sms', 'whatsapp'],
    });
    setShowContactModal(true);
    setCountrySearch('');
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: '', phone: '', email: '', methods: ['sms', 'whatsapp'] });
    setSelectedCountry(null);
    setCountrySearch('');
    setShowCountrySelector(false);
    setShowContactModal(true);
  };

  const getTypeGradient = (type: GroupType) => {
    switch (type) {
      case GroupType.FAMILY:
        return 'from-pink-500/70 via-rose-500/70 to-fuchsia-500/70';
      case GroupType.FRIENDS:
        return 'from-blue-500/70 via-indigo-500/70 to-violet-500/70';
      case GroupType.WORK:
        return 'from-amber-500/70 via-orange-500/70 to-red-500/70';
      default:
        return 'from-emerald-500/70 via-teal-500/70 to-cyan-500/70';
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const group = await createGroup(newGroup);
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '', type: GroupType.FAMILY });
      
      // Only navigate if the group has a real ID (not a temp ID)
      if (group._id && !group._id.startsWith('temp-')) {
        router.push(`/groups/${group._id}`);
      } else {
        // Show success message for offline creation
        alert('Group created! It will sync to the server when you\'re back online.');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation(); // Prevent navigation to group details
    if (!confirm('Are you sure you want to delete this group?')) {
      return;
    }

    setDeletingGroupId(groupId);
    try {
      await deleteGroup(groupId);
      // Group will be removed from list automatically
    } catch (error: any) {
      alert(error.message || 'Failed to delete group');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const getGroupIcon = (type: GroupType) => {
    switch (type) {
      case GroupType.FAMILY:
        return '👨‍👩‍👧‍👦';
      case GroupType.FRIENDS:
        return '👥';
      case GroupType.WORK:
        return '💼';
      default:
        return '🏠';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowInvites(true)}
          className="relative bg-white/80 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-xl shadow hover:shadow-md transition flex items-center gap-2"
          title="View invitations"
        >
          <span>Invitations</span>
          {loadingInvites ? (
            <span className="text-xs text-gray-500">...</span>
          ) : invites.length > 0 ? (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold">{invites.length}</span>
          ) : null}
        </button>
      </div>

      {/* Invitations Modal (code-split) */}
      {showInvites && (
        <InvitationsModal
          invites={invites}
          loading={loadingInvites}
          onClose={() => setShowInvites(false)}
          onOpenGroup={(groupId: string) => {
            setShowInvites(false);
            router.push(`/groups/${groupId}`);
          }}
          onAccept={async (id: string) => {
            await acceptInvitation(id);
            setInvites(prev => prev.filter(i => i.id !== id));
            alert('Invitation accepted. You have joined the group.');
          }}
          onDecline={async (id: string) => {
            await declineInvitation(id);
            setInvites(prev => prev.filter(i => i.id !== id));
          }}
        />
      )}
      {/* Emergency Contacts Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border-2 border-indigo-200/50 dark:border-indigo-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 flex items-center gap-3">
              <span className="text-3xl">📞</span>
              Emergency Contacts
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-500 mt-2 font-semibold">
              Quick access to important people during emergencies
            </p>
          </div>
          <button
            onClick={handleAddContact}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 text-sm"
          >
            <span className="text-lg">+</span>
            Add Contact
          </button>
        </div>

        {loadingContacts ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <span className="text-4xl">📇</span>
            </div>
            <p className="text-gray-800 dark:text-gray-300 mb-4 font-semibold">No emergency contacts yet</p>
            <button
              onClick={handleAddContact}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
            >
              Add your first contact →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1"
                style={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(139, 92, 246, 0.1)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 
                        className="font-extrabold text-xl mb-0"
                        style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                      >
                        {contact.name}
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      <div 
                        className="flex items-center gap-2.5 text-sm"
                        style={{ color: theme === 'dark' ? '#e5e7eb' : '#1f2937' }}
                      >
                        <span className="text-lg">📱</span>
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
                          style={{ color: theme === 'dark' ? '#e5e7eb' : '#1f2937' }}
                        >
                          {contact.phone}
                        </a>
                      </div>
                      {contact.email && (
                        <div 
                          className="flex items-center gap-2.5 text-sm"
                          style={{ color: theme === 'dark' ? '#e5e7eb' : '#1f2937' }}
                        >
                          <span className="text-lg">✉️</span>
                          <a
                            href={`mailto:${contact.email}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate font-semibold"
                            style={{ color: theme === 'dark' ? '#e5e7eb' : '#1f2937' }}
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {contact.methods && contact.methods.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {contact.methods.map((method: string) => (
                      <span
                        key={method}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-900 dark:text-indigo-200 text-xs font-bold shadow-sm border border-indigo-200/50 dark:border-indigo-700/50"
                        style={{ color: theme === 'dark' ? '#c7d2fe' : '#312e81' }}
                      >
                        {method.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2.5 pt-4 border-t border-gray-200/80 dark:border-gray-700/80">
                  <button
                    onClick={() => handleEditContact(contact)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 transition-all text-sm font-bold shadow-sm hover:shadow-md border border-blue-200/50 dark:border-blue-700/50"
                    style={{ color: theme === 'dark' ? '#93c5fd' : '#1e40af' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact._id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/50 dark:hover:to-pink-900/50 transition-all text-sm font-bold shadow-sm hover:shadow-md border border-red-200/50 dark:border-red-700/50"
                    style={{ color: theme === 'dark' ? '#fca5a5' : '#991b1b' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Groups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create private circles to coordinate quickly with family, friends or coworkers.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          + New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">You don't have any groups yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
          {groups.map((group) => (
            <div key={group._id} className="card-surface relative rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1">
              {/* Accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${getTypeGradient(group.type)}`}></div>

              {/* Main Link Area */}
              <Link
                href={group._id.startsWith('temp-') ? '#' : `/groups/${group._id}`}
                onClick={group._id.startsWith('temp-') ? (e) => {
                  e.preventDefault();
                  alert('This group is pending sync. It will be created when you\'re back online.');
                } : undefined}
                className="block p-6"
              >
                  <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl select-none">{getGroupIcon(group.type)}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{group.name}</h3>
                      {group.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    {group._id.startsWith('temp-') && (
                      <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs font-medium">
                        Pending
                      </span>
                    )}
                    {group.isAdmin && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium">{group.type}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium">{group.memberCount || 0} {group.memberCount === 1 ? 'member' : 'members'}</span>
                    {!group._id.startsWith('temp-') && (
                      <span className="ml-1 inline-flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium">View →</span>
                    )}
                  </div>
                </div>
              </Link>
              
              {/* Delete Button - Only show if user created this group or is admin */}
              {group.isAdmin && (
                <div className="card-footer px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <button
                    onClick={(e) => handleDeleteGroup(e, group._id)}
                    disabled={deletingGroupId === group._id || group._id.startsWith('temp-')}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  >
                    {deletingGroupId === group._id ? 'Deleting...' : '🗑️ Delete Group'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (mobile/desktop) */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/40 w-14 h-14 flex items-center justify-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Create new group"
      >
        +
      </button>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 force-light-surface rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Group
            </h2>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white force-light-input"
                  placeholder="e.g., My Family"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white force-light-input"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Type *
                </label>
                <select
                  value={newGroup.type}
                  onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value as GroupType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white force-light-input"
                >
                  {Object.values(GroupType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700"
            style={{ 
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
            }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </h2>
            
            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-colors"
                  style={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#111827' }}
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative flex gap-2">
                  {/* Country Selector Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountrySelector(!showCountrySelector)}
                      className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      style={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff' }}
                    >
                      <span className="text-xl">
                        {selectedCountry?.flag || '🌍'}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedCountry?.dialCode || '+1'}
                      </span>
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Country Dropdown */}
                    {showCountrySelector && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowCountrySelector(false)}
                        />
                        <div 
                          className="absolute z-50 mt-1 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl"
                          style={{ 
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            maxHeight: '24rem'
                          }}
                        >
                          <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' }}>
                            <input
                              type="text"
                              placeholder="Search country..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 text-sm"
                              style={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#111827' }}
                              onClick={(e) => e.stopPropagation()}
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {countries
                              .filter((country) => {
                                if (!countrySearch) return true;
                                const search = countrySearch.toLowerCase();
                                return (
                                  country.name.toLowerCase().includes(search) ||
                                  country.dialCode.includes(search) ||
                                  country.code.toLowerCase().includes(search)
                                );
                              })
                              .map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(country);
                                  // If phone field is empty or doesn't start with a +, replace it with the dial code
                                  const currentPhone = contactForm.phone.trim();
                                  if (!currentPhone || !currentPhone.startsWith('+')) {
                                    setContactForm({ ...contactForm, phone: country.dialCode });
                                  } else {
                                    // Replace existing country code with new one
                                    const phoneWithoutCode = currentPhone.replace(/^\+\d{1,4}\s?/, '');
                                    setContactForm({ ...contactForm, phone: country.dialCode + (phoneWithoutCode ? ' ' + phoneWithoutCode : '') });
                                  }
                                  setShowCountrySelector(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                                  selectedCountry?.code === country.code ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                                }`}
                                style={{
                                  backgroundColor: selectedCountry?.code === country.code 
                                    ? (theme === 'dark' ? 'rgba(88, 28, 135, 0.3)' : '#f3e8ff')
                                    : 'transparent'
                                }}
                              >
                                <span className="text-2xl">{country.flag}</span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}>
                                    {country.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {country.dialCode}
                                  </div>
                                </div>
                                {selectedCountry?.code === country.code && (
                                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Phone Input */}
                  <input
                    type="tel"
                    required
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-colors"
                    style={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#111827' }}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-colors"
                  style={{ backgroundColor: theme === 'dark' ? '#374151' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#111827' }}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notification Methods *
                </label>
                <div className="flex flex-wrap gap-2">
                  {['sms', 'whatsapp', 'email'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 ${
                        contactForm.methods.includes(method)
                          ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 shadow-sm'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      style={{
                        backgroundColor: contactForm.methods.includes(method)
                          ? (theme === 'dark' ? 'rgba(88, 28, 135, 0.3)' : '#f3e8ff')
                          : (theme === 'dark' ? '#1f2937' : '#ffffff'),
                        color: contactForm.methods.includes(method)
                          ? (theme === 'dark' ? '#e9d5ff' : '#6b21a8')
                          : (theme === 'dark' ? '#d1d5db' : '#374151')
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={contactForm.methods.includes(method)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setContactForm({
                              ...contactForm,
                              methods: [...contactForm.methods, method],
                            });
                          } else {
                            setContactForm({
                              ...contactForm,
                              methods: contactForm.methods.filter((m) => m !== method),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span 
                        className="text-sm font-medium capitalize"
                        style={{
                          color: contactForm.methods.includes(method)
                            ? (theme === 'dark' ? '#e9d5ff' : '#6b21a8')
                            : (theme === 'dark' ? '#d1d5db' : '#374151')
                        }}
                      >
                        {method}
                      </span>
                    </label>
                  ))}
                </div>
                {contactForm.methods.length === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Select at least one notification method
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(false);
                    setEditingContact(null);
                    setContactForm({ name: '', phone: '', email: '', methods: ['sms', 'whatsapp'] });
                    setSelectedCountry(null);
                    setCountrySearch('');
                    setShowCountrySelector(false);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contactForm.methods.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingContact ? 'Update' : 'Add'} Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

