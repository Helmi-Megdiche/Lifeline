"use client";
import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};
