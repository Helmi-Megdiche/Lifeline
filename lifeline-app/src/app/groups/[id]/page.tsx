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
}

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { groups, updateStatus, deleteGroup, addMember } = useGroups();
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

      // If member status for current user is missing, fetch user's global status as fallback
      try {
        const meId = user?.id;
        if (meId) {
          const hasMemberStatus = Array.isArray(data.members) && data.members.some((m: any) => {
            const uid = typeof m.userId === 'object' ? m.userId?._id : m.userId;
            return uid === meId && !!m.status;
          });
          if (!hasMemberStatus) {
            const myStatusResp = await fetch(`${API_CONFIG.BASE_URL}/status/user/${meId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (myStatusResp.ok) {
              const myStatusData = await myStatusResp.json();
              const list = myStatusData.data || [];
              // Take most recent
              if (list.length > 0) {
                const latest = list[0];
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

      // Fetch status summary if group has members
      if (data.memberCount > 0) {
        try {
          const statusResponse = await fetch(`${API_CONFIG.BASE_URL}/groups/${params.id}/status`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            setStatusCounts(statusData.statusCounts || { safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: 0 });
          }
        } catch (statusError) {
          console.warn('Failed to fetch status summary:', statusError);
          // Don't throw - status summary is optional
        }
      }
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
      await addMember(params.id as string, userId);
      // Refresh group details after inviting
      await fetchGroupDetails();
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
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/groups')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            ← Back to Groups
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{groupDetails.name}</h1>
          {groupDetails.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">{groupDetails.description}</p>
          )}
        </div>
        {groupDetails.isAdmin && (
          <button
            onClick={handleDeleteGroup}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Delete Group
          </button>
        )}
      </div>

      {/* Status Buttons */}
      {currentUserMember && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Update Your Status
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleUpdateStatus(UserStatus.SAFE)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ✅ I'm Safe
            </button>
            <button
              onClick={() => handleUpdateStatus(UserStatus.NEED_HELP)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ⚠️ Need Help
            </button>
            <button
              onClick={() => handleUpdateStatus(UserStatus.IN_DANGER)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🆘 In Danger
            </button>
          </div>
          {(
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Current status: <span className="font-medium">{getStatusLabel(currentUserMember.status || userGlobalStatus || undefined)}</span>
            </p>
          )}
        </div>
      )}

      {/* Invite Member Button */}
      {groupDetails.isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Group Status Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-bold text-green-700 dark:text-green-400">{statusCounts.safe}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Safe</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="font-bold text-yellow-700 dark:text-yellow-400">{statusCounts.need_help}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Need Help</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-3xl mb-2">🆘</div>
              <div className="font-bold text-red-700 dark:text-red-400">{statusCounts.in_danger}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In Danger</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
              <div className="text-3xl mb-2">❌</div>
              <div className="font-bold text-gray-700 dark:text-gray-400">{statusCounts.offline}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Offline</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
              <div className="text-3xl mb-2">❓</div>
              <div className="font-bold text-gray-700 dark:text-gray-400">{statusCounts.unknown}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unknown</div>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(member.status)}`}>
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

