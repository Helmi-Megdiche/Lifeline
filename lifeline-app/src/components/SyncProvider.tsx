"use client";
import { ReactNode } from 'react';
import { useSync } from '@/hooks/useSync';

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  useSync();
  return <>{children}</>;
};
