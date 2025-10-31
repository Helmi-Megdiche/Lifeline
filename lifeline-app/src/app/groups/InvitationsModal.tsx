'use client';

import React from 'react';

type Invitation = { id: string; groupName?: string };

export default function InvitationsModal({
  invites,
  loading,
  onClose,
  onPreview,
  preview,
  onAccept,
  onDecline,
}: {
  invites: Invitation[];
  loading: boolean;
  onClose: () => void;
  onPreview: (id: string) => Promise<void> | void;
  preview: { group: any; members: any[] } | null;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg card-surface rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Invitations</h2>
          <button
            onClick={onClose}
            aria-label="Close invitations"
            className="p-2 rounded-lg bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : invites.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">No invitations at the moment.</p>
        ) : (
          <div className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <button
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    onClick={() => onPreview(inv.id)}
                  >
                    {inv.groupName || 'Group'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
                      onClick={() => onAccept(inv.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-1 rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm"
                      onClick={() => onDecline(inv.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
                {preview && (
                  <div className="mt-3 text-sm text-gray-800 dark:text-gray-200">
                    <div className="mb-2">
                      <div className="font-semibold">{preview.group?.name}</div>
                      {preview.group?.description && (
                        <div className="text-gray-600 dark:text-gray-400">{preview.group.description}</div>
                      )}
                    </div>
                    <div className="mb-2">
                      <div className="font-medium">Members</div>
                      <ul className="list-disc ml-5">
                        {preview.members?.map((m: any) => (
                          <li key={m.id} className="flex items-center gap-2">
                            <span>{typeof m.user === 'object' ? m.user?.username : 'User'}</span>
                            {m.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">Admin</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


