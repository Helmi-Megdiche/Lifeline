"use client";
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/ClientAuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // Routes that don't require authentication
  const publicRoutes = ['/auth'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Only redirect once per authentication state change, not on every render
    if (!isLoading && !hasRedirected.current) {
      if (!isAuthenticated && !isPublicRoute) {
        // Redirect to auth page if not authenticated and not on a public route
        hasRedirected.current = true;
        router.push('/auth');
      }
    }
    
    // Reset redirect flag when authentication state changes
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isLoading, pathname, router, isPublicRoute]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated and not on public route
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
};
