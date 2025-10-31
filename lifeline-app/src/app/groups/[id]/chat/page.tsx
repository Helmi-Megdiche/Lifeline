'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const Chat = dynamic(() => import('../../Chat'), { ssr: false });

export default function GroupChatPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Group Chat</h1>
        <Link
          href={`/groups/${id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white px-4 py-2 text-sm shadow focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          ← Back to Group
        </Link>
      </div>
      <Chat groupId={id} />
    </div>
  );
}


