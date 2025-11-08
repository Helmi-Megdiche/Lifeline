"use client";
import { useEffect } from 'react';

/**
 * Hook to prevent body scroll when modal is open
 */
export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Store original overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow on unmount
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isLocked]);
}
