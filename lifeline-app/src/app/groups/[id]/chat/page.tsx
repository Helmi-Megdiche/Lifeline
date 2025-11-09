'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

const Chat = dynamic(() => import('../../Chat'), { ssr: false });

export default function GroupChatPage() {
  const params = useParams();
  const { theme } = useTheme();
  const id = params?.id as string;
  const isLight = theme === 'light';

  return (
    <div className="min-h-screen pb-4 sm:pb-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: isLight ? '#111827' : '#ffffff' }}
        >
          💬 Group Chat
        </h1>
        <Link
          href={`/groups/${id}`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-semibold transition-all shadow-md hover:shadow-lg"
          style={isLight ? {
            backgroundColor: '#f3f4f6',
            color: '#374151'
          } : {
            backgroundColor: '#374151',
            color: '#f9fafb'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isLight ? '#e5e7eb' : '#4b5563';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isLight ? '#f3f4f6' : '#374151';
          }}
        >
          <span>←</span>
          <span className="hidden sm:inline">Back to Group</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>
      <div className="w-full">
        <Chat groupId={id} />
      </div>
    </div>
  );
}


