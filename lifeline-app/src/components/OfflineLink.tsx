"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface OfflineLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

/**
 * Custom Link component that disables prefetching when offline
 * This prevents Next.js from making RSC requests that block navigation
 */
export default function OfflineLink({ href, children, className, onClick, ...props }: OfflineLinkProps) {
  // Check if navigator is available (client-side only)
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' && typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Disable prefetch when offline to prevent blocking navigation
  const prefetch = !isOffline;

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      prefetch={prefetch}
      {...props}
    >
      {children}
    </Link>
  );
}

