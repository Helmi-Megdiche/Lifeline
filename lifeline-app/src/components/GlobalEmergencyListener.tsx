"use client";
import { useEffect, useState } from 'react';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import EmergencyListenerIndicator from './EmergencyListenerIndicator';
import { useAuth } from '@/contexts/ClientAuthContext';

const getEmergencyDetectionKey = (userId?: string) => {
  return userId ? `lifeline:emergencyDetectionEnabled:${userId}` : 'lifeline:emergencyDetectionEnabled';
};

export default function GlobalEmergencyListener() {
  const [emergencyDetectionEnabled, setEmergencyDetectionEnabled] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load emergency detection setting - user-specific
  useEffect(() => {
    if (!user?.id) {
      setEmergencyDetectionEnabled(false);
      return;
    }

    const EMERGENCY_DETECTION_KEY = getEmergencyDetectionKey(user.id);
    
    const loadSetting = () => {
      const saved = localStorage.getItem(EMERGENCY_DETECTION_KEY);
      if (saved !== null) {
        setEmergencyDetectionEnabled(JSON.parse(saved));
      } else {
        // Default to false if no setting found
        setEmergencyDetectionEnabled(false);
      }
    };
    
    loadSetting();
    
    // Listen for changes from Profile page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === EMERGENCY_DETECTION_KEY) {
        loadSetting();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (same-origin)
    const handleCustomChange = () => loadSetting();
    window.addEventListener('emergency-detection-changed', handleCustomChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emergency-detection-changed', handleCustomChange);
    };
  }, [user?.id]);

  // Initialize emergency listener with real-time speech recognition
  // This works app-wide when enabled from Profile settings
  // IMPORTANT: Only enable if user is authenticated
  const emergencyListener = useEmergencyListener({
    enabled: emergencyDetectionEnabled && isAuthenticated && !!user,
    amplitudeThreshold: 0.7,
    keywords: ['help', 'sos', 'emergency', 'lifeline', 'rescue', 'save me', 'need help', 'please help', 'urgent', 'accident', 'fire', 'trapped', 'injured'],
    recordingDuration: 15000, // 15 seconds recording duration
  });

  // Stop listener immediately when user logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // User logged out - immediately stop the listener
      try {
        if (emergencyListener.stopListening) {
          emergencyListener.stopListening();
        }
      } catch (error) {
        // Silently handle any errors during stop
      }
    }
  }, [isAuthenticated, user]);

  // Don't show indicator if user is not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Show the indicator with real-time transcript on all pages
  return (
    <EmergencyListenerIndicator 
      isListening={emergencyListener.isListening}
      isRecording={emergencyListener.isRecording}
      amplitude={emergencyListener.amplitude}
      transcript={emergencyListener.transcript}
    />
  );
}

