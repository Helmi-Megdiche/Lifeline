'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGroups } from '@/contexts/GroupsContext';
import { UserStatus } from '@/types/group';
import { API_CONFIG } from '@/lib/config';
import { useAuth } from '@/contexts/ClientAuthContext';
import InviteMemberModal from '@/components/InviteMemberModal';

interface GroupDetails {
  _id: string;
  name: string;
  ownerId: string;
  description?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  members: any[];
  memberCount: number;
  isAdmin: boolean;
  statusCounts?: {
    safe: number;
    need_help: number;
    in_danger: number;
    offline: number;
    unknown: number;
  };
}

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { groups, updateStatus, deleteGroup, createInvitation } = useGroups();
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState({ safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: 0 });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [userGlobalStatus, setUserGlobalStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetails();
  }, [params.id]);

  const fetchGroupDetails = async () => {
    if (!token || !params.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch group details
      const detailsResponse = await fetch(`${API_CONFIG.BASE_URL}/groups/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error('❌ Failed to fetch group details:', detailsResponse.status, errorText);
        throw new Error(`Failed to fetch group details: ${detailsResponse.status}`);
      }

      const data = await detailsResponse.json();
      setGroupDetails(data);
      // NEW: set status summary counts directly from group details (computed on backend)
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      } else if (Array.isArray(data.members)) {
        // Fallback: compute counts client-side from member statuses
        const counts = { safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: 0 } as any;
        data.members.forEach((m: any) => {
          const s = m.status || 'unknown';
          if (counts[s] !== undefined) counts[s]++;
          else counts.unknown++;
        });
        setStatusCounts(counts);
      }

      // If member status for current user is missing or 'unknown', fetch user's global status as fallback
      try {
        const meId = user?.id;
        if (meId) {
          const hasMemberStatus = Array.isArray(data.members) && data.members.some((m: any) => {
            const uid = typeof m.userId === 'object' ? m.userId?._id : m.userId;
            // Treat missing or explicit 'unknown' as no usable status
            return uid === meId && !!m.status && m.status !== 'unknown';
          });
          if (!hasMemberStatus) {
            const myStatusResp = await fetch(`${API_CONFIG.BASE_URL}/status/user/${meId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (myStatusResp.ok) {
              const myStatusData = await myStatusResp.json();
              const list = myStatusData.data || [];
              // Take most recent (API may be ascending); prefer the last entry
              if (list.length > 0) {
                const latest = list[list.length - 1];
                setUserGlobalStatus(latest.status || null);
              } else {
                setUserGlobalStatus(null);
              }
            }
          } else {
            setUserGlobalStatus(null);
          }
        }
      } catch {}

      // Removed legacy status summary fetch; we rely on data.statusCounts from backend
    } catch (err: any) {
      console.error('❌ Error fetching group details:', err);
      setError(err.message || 'Failed to fetch group details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (status: UserStatus) => {
    try {
      await updateStatus(params.id as string, status);
      // Refresh group details
      await fetchGroupDetails();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteGroup(params.id as string);
      router.push('/groups');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleInviteMember = async (userId: string) => {
    try {
      await createInvitation(params.id as string, userId);
      // Invitation created; just close modal and keep UI (member not yet added)
      alert('Invitation sent. The user must accept to join the group.');
      setIsInviteModalOpen(false);
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'safe':
        return '✅';
      case 'need_help':
        return '⚠️';
      case 'in_danger':
        return '🆘';
      case 'offline':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'safe':
        return 'Safe';
      case 'need_help':
        return 'Need Help';
      case 'in_danger':
        return 'In Danger';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'safe':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'need_help':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'in_danger':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'offline':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !groupDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Group not found'}</p>
        <button
          onClick={() => router.push('/groups')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Go back to groups
        </button>
      </div>
    );
  }

  const currentUserMember = groupDetails.members.find(
    (m: any) => m.userId._id === user?.id || m.userId === user?.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="relative card-surface rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-8 pt-8 pb-6 mb-2 overflow-hidden flex flex-col gap-4 animate-fade-in">
          {/* Back Button (hero top left, never covered) */}
          <button
            onClick={() => router.push('/groups')}
            className="absolute left-4 top-4 bg-white/70 dark:bg-gray-700/70 glass-card shadow px-4 py-2 rounded-full flex items-center gap-2 text-blue-700 dark:text-blue-200 font-semibold text-base hover:bg-blue-100/80 hover:shadow-xl border border-blue-100 dark:border-blue-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Back to groups"
            style={{ zIndex: 3 }}
          >
            <svg className="w-5 h-5 mr-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 19.5L8.5 12.5L15.5 5.5" /></svg>
            Back
          </button>
          {/* Accent Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-fuchsia-500 rounded-t-2xl" />
          {/* Hero Content */}
          <div className="flex flex-wrap gap-6 items-center justify-between mb-2 pt-6">
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {/* Icon */}
              <div className="text-4xl md:text-5xl select-none">
                {groupDetails.type === 'FAMILY' ? '👨‍👩‍👧‍👦' : groupDetails.type === 'FRIENDS' ? '👥' : groupDetails.type === 'WORK' ? '💼' : '🏠'}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white drop-shadow py-1">{groupDetails.name}</h1>
                {groupDetails.description && <div className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 max-w-xs truncate">{groupDetails.description}</div>}
              </div>
            </div>
            {/* Chips - glass and colored bg for light mode */}
            <div className="flex flex-col md:flex-row gap-2 items-end md:items-start">
              <span className="chip-glass bg-blue-100/80 dark:bg-gray-700/60 border border-blue-200 dark:border-gray-700 text-blue-800 dark:text-blue-200 shadow-sm backdrop-blur-sm">
                {groupDetails.type.charAt(0) + groupDetails.type.slice(1).toLowerCase()}
              </span>
              <span className="chip-glass bg-indigo-100/80 dark:bg-gray-700/60 border border-indigo-200 dark:border-gray-700 text-indigo-800 dark:text-blue-200 shadow-sm">
                🧑‍🤝‍🧑 {groupDetails.memberCount} {groupDetails.memberCount === 1 ? 'member' : 'members'}
              </span>
              <span className="chip-glass bg-purple-100/80 dark:bg-gray-700/60 border border-purple-200 dark:border-gray-700 text-purple-800 dark:text-purple-100 shadow-sm">
                📅 {new Date(groupDetails.createdAt).toLocaleDateString()}
              </span>
              {groupDetails.isAdmin && (
                <span className="chip-glass bg-blue-500/80 dark:bg-blue-900 text-white border border-blue-300 dark:border-blue-900 shadow font-bold tracker-wide">
                  Admin Access
                </span>
              )}
            </div>
          </div>
          {/* Delete Button in Footer (admin only) */}
          {groupDetails.isAdmin && (
            <div className="card-footer flex justify-end items-center pt-6 pb-0 px-0 mt-0 border-0 bg-transparent">
              <button
                onClick={handleDeleteGroup}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                style={{ minWidth: 140 }}
              >
                Delete Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Button */}
      {groupDetails.isAdmin && (
        <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </button>
        </div>
      )}

      {/* Status Summary */}
      {groupDetails.memberCount > 0 && (
        <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Group Status Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50/80 dark:bg-green-900/40 rounded-xl">
              <div className="text-4xl mb-2">✅</div>
              <div className="font-extrabold text-2xl md:text-3xl text-green-700 dark:text-green-400" style={{textShadow:'0 1px 4px rgba(0,0,0,0.06)'}}> {statusCounts.safe} </div>
              <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100" style={{textShadow:'0 1px 6px rgba(0,0,0,0.07)'}}>Safe</div>
            </div>
            <div className="text-center p-4 bg-yellow-50/90 dark:bg-yellow-900/40 rounded-xl">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="font-extrabold text-2xl md:text-3xl text-yellow-700 dark:text-yellow-400" style={{textShadow:'0 1px 4px rgba(0,0,0,0.06)'}}> {statusCounts.need_help} </div>
              <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100" style={{textShadow:'0 1px 6px rgba(0,0,0,0.07)'}}>Need Help</div>
            </div>
            <div className="text-center p-4 bg-gray-50/90 dark:bg-gray-700/40 rounded-xl">
              <div className="text-4xl mb-2">❌</div>
              <div className="font-extrabold text-2xl md:text-3xl text-gray-700 dark:text-gray-400" style={{textShadow:'0 1px 4px rgba(0,0,0,0.09)'}}> {statusCounts.offline} </div>
              <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100" style={{textShadow:'0 1px 6px rgba(0,0,0,0.07)'}}>Offline</div>
            </div>
            <div className="text-center p-4 bg-gray-50/90 dark:bg-gray-700/40 rounded-xl">
              <div className="text-4xl mb-2">❓</div>
              <div className="font-extrabold text-2xl md:text-3xl text-gray-700 dark:text-gray-400" style={{textShadow:'0 1px 4px rgba(0,0,0,0.09)'}}> {statusCounts.unknown} </div>
              <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100" style={{textShadow:'0 1px 6px rgba(0,0,0,0.07)'}}>Unknown</div>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Members ({groupDetails.memberCount})
        </h2>
        <div className="space-y-3">
          {groupDetails.members && groupDetails.members.length > 0 ? (
            groupDetails.members.map((member: any) => {
              const username = typeof member.userId === 'object' ? member.userId?.username : 'Unknown';
              const email = typeof member.userId === 'object' ? member.userId?.email : '';
              const memberUserId = typeof member.userId === 'object' ? member.userId?._id : member.userId;
              const isCurrentUser = memberUserId === user?.id;

              return (
                <div
                  key={member._id || memberUserId}
                  className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{getStatusIcon(member.status)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {username}
                          {isCurrentUser && (
                            <span className="text-blue-600 dark:text-blue-400"> (You)</span>
                          )}
                        </span>
                        {member.role === 'admin' && (
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      {email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span 
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(member.status)}${getStatusLabel(member.status)==='Unknown' ? ' light-text-white' : ''}`}
                      style={getStatusLabel(member.status)==='Unknown' && typeof window !== 'undefined' && window.document?.documentElement?.classList?.contains('dark') ? {} : getStatusLabel(member.status)==='Unknown' ? { color: '#fff', fontWeight: 700 } : {}}
                    >
                      {getStatusLabel(member.status)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No members yet
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteMember}
        existingMemberIds={
          groupDetails.members
            ? groupDetails.members.map((m: any) => {
                const memberUserId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
                return memberUserId?.toString() || '';
              }).filter(Boolean)
            : []
        }
      />
    </div>
  );
}

