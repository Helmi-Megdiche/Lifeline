'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGroups } from '@/contexts/GroupsContext';
import { UserStatus, GroupType } from '@/types/group';
import { API_CONFIG } from '@/lib/config';
import { useAuth } from '@/contexts/ClientAuthContext';
import InviteMemberModal from '@/components/InviteMemberModal';
import dynamic from 'next/dynamic';
import Link from 'next/link';

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
  const { groups, updateStatus, deleteGroup, createInvitation, listMyInvitations, acceptInvitation, declineInvitation, updateGroup, leaveGroup, removeMember } = useGroups();
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState({ safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: 0 });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [userGlobalStatus, setUserGlobalStatus] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; type: GroupType } | null>(null);
  const [leftGroup, setLeftGroup] = useState(false);
  const [locModal, setLocModal] = useState<{ username: string; coords: { lat: number; lng: number } | null; updatedAt?: number | string | null } | null>(null);

  const MemberLocationModal = dynamic(() => import('../MemberLocationModal'), { ssr: false });

  useEffect(() => {
    fetchGroupDetails();
  }, [params.id]);

  // Load pending invitation for this group (if any)
  useEffect(() => {
    const loadInvite = async () => {
      try {
        const list = await listMyInvitations();
        const found = list.find((i: any) => i.groupId === params.id);
        setPendingInviteId(found?.id || null);
      } catch {}
    };
    loadInvite();
  }, [params.id, listMyInvitations]);

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
        // If forbidden, try to load a limited preview via pending invitation
        if (detailsResponse.status === 403) {
          try {
            const invites = await listMyInvitations();
            const match = invites.find((i: any) => i.groupId === params.id);
            if (match?.id) {
              setPendingInviteId(match.id);
              const previewResp = await fetch(`${API_CONFIG.BASE_URL}/invitations/${match.id}/preview`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (previewResp.ok) {
                const pdata = await previewResp.json();
                const pv = pdata.data || {};
                const members = Array.isArray(pv.members) ? pv.members.map((m: any) => ({
                  userId: m.user?._id ? { _id: m.user._id, username: m.user.username, email: m.user.email } : m.user,
                  role: m.role,
                  status: 'unknown',
                })) : [];
                const gd: GroupDetails = {
                  _id: pv.group?._id || (params.id as string),
                  name: pv.group?.name || 'Group',
                  ownerId: pv.group?.ownerId || '',
                  description: pv.group?.description || '',
                  type: pv.group?.type || 'GROUP',
                  createdAt: pv.group?.createdAt || new Date().toISOString(),
                  updatedAt: pv.group?.updatedAt || new Date().toISOString(),
                  members,
                  memberCount: members.length,
                  isAdmin: false,
                  statusCounts: { safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: members.length },
                };
                setGroupDetails(gd);
                setStatusCounts(gd.statusCounts!);
                return; // Render preview without throwing
              }
            }
          } catch (e) {
            // ignore and fall through to error
          }
        }
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

  if (leftGroup) {
    return (
      <div className="max-w-xl mx-auto card-surface rounded-2xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">You left this group</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">You are no longer a member of this group.</p>
        <button
          onClick={() => router.push('/groups')}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          Go to My Groups
        </button>
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
              <button
                onClick={() => {
                  setEditForm({
                    name: groupDetails.name || '',
                    description: groupDetails.description || '',
                    type: (groupDetails.type as any) as GroupType,
                  });
                  setIsEditOpen(true);
                }}
                className="ml-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-5 py-2 rounded-lg font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pending invitation banner for this group */}
      {pendingInviteId && (
        <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center justify-between">
          <div className="text-gray-800 dark:text-gray-100 font-medium">You have been invited to join this group.</div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
              onClick={async () => {
                await acceptInvitation(pendingInviteId);
                setPendingInviteId(null);
                await fetchGroupDetails();
              }}
            >
              Accept
            </button>
            <button
              className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm"
              onClick={async () => {
                await declineInvitation(pendingInviteId);
                setPendingInviteId(null);
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Invite Member (compact and responsive) */}
      {groupDetails.isAdmin && (
        <div className="mt-2 mb-2 flex justify-end">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm md:text-base shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Invite member"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite</span>
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

      {/* Go to Group Chat */}
      <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex justify-end">
        <Link
          href={`/groups/${params.id}/chat`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm md:text-base shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h10" />
          </svg>
          Open Group Chat
        </Link>
      </div>

      {/* Members List */}
      <div className="card-surface bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">
            Members ({groupDetails.memberCount})
          </h2>
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-800 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-semibold">Click members to view their location</span>
          </div>
        </div>
        {/* Leave Group button for non-owners */}
        {groupDetails.ownerId !== user?.id && (
          <div className="flex justify-end mb-4">
            <button
              className="px-5 py-2.5 rounded-lg bg-gray-200/80 hover:bg-gray-300/80 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
              onClick={async () => {
                if (confirm('Leave this group?')) {
                  await leaveGroup(groupDetails._id);
                  setLeftGroup(true);
                }
              }}
            >
              Leave Group
            </button>
          </div>
        )}
        <div className="space-y-4">
          {groupDetails.members && groupDetails.members.length > 0 ? (
            groupDetails.members.map((member: any) => {
              const username = typeof member.userId === 'object' ? member.userId?.username : 'Unknown';
              const email = typeof member.userId === 'object' ? member.userId?.email : '';
              const memberUserId = typeof member.userId === 'object' ? member.userId?._id : member.userId;
              const isCurrentUser = memberUserId === user?.id;
              const isAdmin = groupDetails.isAdmin;

              // Don't allow removing the owner
              const isOwner = memberUserId === groupDetails.ownerId;
              const canRemove = isAdmin && !isOwner && !isCurrentUser;

              return (
                <div
                  key={member._id || memberUserId}
                  className="flex items-center justify-between p-5 bg-white dark:bg-gray-700/50 rounded-xl shadow-md dark:shadow-none hover:shadow-lg dark:hover:shadow-md border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all duration-300 group"
                  onClick={async () => {
                    // Show location when clicking on member card
                    try {
                      if (!memberUserId) return;
                      const resp = await fetch(`${API_CONFIG.BASE_URL}/status/user/${memberUserId}/latest`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                      });
                      if (resp.ok) {
                        const j = await resp.json();
                        const d = j.data || null;
                        const coords = d && typeof d.latitude === 'number' && typeof d.longitude === 'number'
                          ? { lat: d.latitude, lng: d.longitude }
                          : null;
                        setLocModal({ username, coords, updatedAt: d?.updatedAt || d?.timestamp });
                      } else {
                        setLocModal({ username, coords: null });
                      }
                    } catch {
                      setLocModal({ username, coords: null });
                    }
                  }}
                  title={`Click to view ${username}'s location`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl filter drop-shadow-sm opacity-90">{getStatusIcon(member.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-700 dark:text-white text-lg">
                          {username}
                          {isCurrentUser && (
                            <span className="text-blue-700 dark:text-blue-400 font-medium"> (You)</span>
                          )}
                          {isOwner && (
                            <span className="text-purple-700 dark:text-purple-400 font-medium"> (Owner)</span>
                          )}
                        </span>
                        {member.role === 'admin' && (
                          <span className="bg-blue-500/80 dark:from-blue-900 dark:to-blue-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                            Admin
                          </span>
                        )}
                      </div>
                      {email && (
                        <p className="text-sm text-gray-900 dark:text-gray-400 mt-1 font-semibold">{email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span 
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(member.status)}${getStatusLabel(member.status)==='Unknown' ? ' light-text-white' : ''}`}
                      style={getStatusLabel(member.status)==='Unknown' && typeof window !== 'undefined' && window.document?.documentElement?.classList?.contains('dark') ? {} : getStatusLabel(member.status)==='Unknown' ? { color: '#fff', fontWeight: 700 } : {}}
                    >
                      {getStatusLabel(member.status)}
                    </span>
                    {canRemove && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation(); // Prevent triggering the location modal
                          const confirmMessage = `Are you sure you want to remove ${username} from this group? This action cannot be undone.`;
                          if (!confirm(confirmMessage)) {
                            return;
                          }

                          try {
                            if (!memberUserId) {
                              alert('Cannot identify member to remove');
                              return;
                            }
                            // Ensure memberUserId is a string
                            const userIdToRemove = String(memberUserId);
                            console.log('Removing member:', { groupId: groupDetails._id, userId: userIdToRemove, username });
                            await removeMember(groupDetails._id, userIdToRemove);
                            // Small delay to ensure backend has processed the deletion
                            await new Promise(resolve => setTimeout(resolve, 300));
                            // Refresh group details after removal
                            await fetchGroupDetails();
                            console.log('✅ Member removed successfully, UI refreshed');
                          } catch (error: any) {
                            console.error('Error removing member:', error);
                            alert(error.message || 'Failed to remove member');
                          }
                        }}
                        className="flex items-center justify-center p-2 rounded-lg bg-red-100/60 hover:bg-red-200/80 dark:bg-red-900/40 dark:hover:bg-red-800/40 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={`Remove ${username} from the group`}
                        aria-label={`Remove ${username}`}
                      >
                        <svg 
                          className="w-5 h-5 text-red-600 dark:text-red-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <div className="flex items-center text-blue-700 dark:text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        aria-label="View Location"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
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

      {/* Member location modal */}
      {locModal && (
        <MemberLocationModal
          onClose={() => setLocModal(null)}
          username={locModal.username}
          coords={locModal.coords}
          updatedAt={locModal.updatedAt || null}
        />
      )}

      {/* Edit Group Modal (admins) */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card-surface rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Group</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                aria-label="Close edit"
                className="p-2 rounded-lg bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateGroup(groupDetails._id, editForm);
                  await fetchGroupDetails();
                  setIsEditOpen(false);
                } catch (err: any) {
                  alert(err.message || 'Failed to update group');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as unknown as GroupType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {Object.values(GroupType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

