'use client';

import React, { useState } from 'react';
import { useGroups } from '@/contexts/GroupsContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GroupType } from '@/types/group';

export default function GroupsPage() {
  const { groups, isLoading, createGroup, deleteGroup } = useGroups();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    type: GroupType.FAMILY,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  <div className="text-4xl">{getGroupIcon(group.type)}</div>
                  <div className="flex gap-2">
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
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {group.name}
                </h3>
                
                {group.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{group.type}</span>
                  <span>{group.memberCount || 0} members</span>
                </div>
              </Link>
              
              {/* Delete Button - Only show if user created this group or is admin */}
              {group.isAdmin && (
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <button
                    onClick={(e) => handleDeleteGroup(e, group._id)}
                    disabled={deletingGroupId === group._id || group._id.startsWith('temp-')}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    {deletingGroupId === group._id ? 'Deleting...' : '🗑️ Delete Group'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
    </div>
  );
}

