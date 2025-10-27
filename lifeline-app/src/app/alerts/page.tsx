"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useAlerts } from '@/contexts/AlertsContext';
import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';

// Import Leaflet CSS - REQUIRED for map tiles to display
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
// MarkerClusterGroup removed - using individual markers instead
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => (mod as any).Circle), { ssr: false }) as any;

// Configure Leaflet icons to avoid 404 errors
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  
  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface Alert {
  _id: string;
  _rev?: string;
  userId: string;
  username: string;
  category: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'false_alarm';
  reportCount: number;
  reportedBy: string[];
  dedupHash: string;
  createdAt: string;
  expiresAt: string;
  synced: boolean;
  hidden: boolean;
  comments?: Array<{
    userId: string;
    username: string;
    comment: string;
    createdAt: string | Date;
  }>;
}

const AlertCreateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (alertData: any) => void;
  userLocation?: { lat: number; lng: number };
}> = ({ isOpen, onClose, onCreate, userLocation }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    category: 'emergency',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    ttlHours: 24
  });
  const [location, setLocation] = useState(userLocation || { lat: 0, lng: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update location when userLocation changes
  useEffect(() => {
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      setLocation(userLocation);
    }
  }, [userLocation]);

  const categories = [
    { value: 'emergency', label: '🚨 Emergency', color: 'red', icon: '🚨' },
    { value: 'safety', label: '⚠️ Safety Hazard', color: 'orange', icon: '⚠️' },
    { value: 'weather', label: '🌦️ Weather Alert', color: 'blue', icon: '🌦️' },
    { value: 'traffic', label: '🚦 Traffic Issue', color: 'yellow', icon: '🚦' },
    { value: 'other', label: '📢 Other', color: 'gray', icon: '📢' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    // Check if location is valid
    if (location.lat === 0 && location.lng === 0) {
      alert('Please wait for your location to be detected, or click "Update My Location" on the alerts page.');
      return;
    }

    console.log('Creating alert with location:', location);

    setIsSubmitting(true);
    try {
      await onCreate({
        ...formData,
        location: {
          ...location,
          address: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
        },
        expiresAt: new Date(Date.now() + formData.ttlHours * 60 * 60 * 1000).toISOString(),
        reportCount: 0,
        reportedBy: [],
        dedupHash: '',
        status: 'active',
        hidden: false
      });
      
      setFormData({
        category: 'emergency',
        title: '',
        description: '',
        severity: 'medium',
        ttlHours: 24
      });
      onClose();
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <span className="text-2xl sm:text-3xl">🚨</span>
              <span className="text-lg sm:text-2xl">Create Alert</span>
            </h2>
            <button
              onClick={onClose}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-full transition-colors`}
            >
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
              <div>
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 sm:mb-3`}>
                  Category
                </label>
                <div className="space-y-1 sm:space-y-2">
                  {categories.map(cat => (
                    <label key={cat.value} className={`flex items-center p-2 sm:p-3 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={formData.category === cat.value}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-lg sm:text-2xl mr-2 sm:mr-3">{cat.icon}</span>
                      <span className={`text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium flex-1`}>{cat.label}</span>
                      {formData.category === cat.value && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 sm:mb-3`}>
                  Severity Level
                </label>
                <div className="space-y-1 sm:space-y-2">
                  {[
                    { value: 'low', label: 'Low', color: 'green', icon: '🟢' },
                    { value: 'medium', label: 'Medium', color: 'yellow', icon: '🟡' },
                    { value: 'high', label: 'High', color: 'orange', icon: '🟠' },
                    { value: 'critical', label: 'Critical', color: 'red', icon: '🔴' }
                  ].map(sev => (
                    <label key={sev.value} className={`flex items-center p-2 sm:p-3 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="severity"
                        value={sev.value}
                        checked={formData.severity === sev.value}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="sr-only"
                      />
                      <span className="text-lg sm:text-xl mr-2 sm:mr-3">{sev.icon}</span>
                      <span className={`text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium flex-1`}>{sev.label}</span>
                      {formData.severity === sev.value && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2`}>
                Alert Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base`}
                placeholder="Brief description of the alert"
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2`}>
                Detailed Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm sm:text-base`}
                rows={3}
                placeholder="Provide detailed information about the alert..."
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2`}>
                Duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="168"
                  value={formData.ttlHours}
                  onChange={(e) => setFormData({ ...formData, ttlHours: parseInt(e.target.value) })}
                  className={`flex-1 h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                />
                <div className={`${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} px-2 sm:px-3 py-1 rounded-lg font-semibold min-w-[60px] sm:min-w-[80px] text-center text-xs sm:text-sm`}>
                  {formData.ttlHours}h
                </div>
              </div>
              <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                <span>1 hour</span>
                <span>1 week</span>
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'} rounded-xl p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📍</span>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                  Alert Location
                </span>
              </div>
              {location.lat !== 0 && location.lng !== 0 ? (
                <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-blue-800'}`}>
                  Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
                </div>
              ) : (
                <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-blue-600'} italic`}>
                  Getting your location...
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:flex-1 px-6 py-3 border-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-xl font-semibold transition-all text-sm sm:text-base`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || (location.lat === 0 && location.lng === 0)}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  '🚨 Create Alert'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AlertUpdateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (alertId: string, alertData: any) => void;
  alert: Alert | null;
  userLocation?: { lat: number; lng: number };
}> = ({ isOpen, onClose, onUpdate, alert, userLocation }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    category: 'emergency',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [location, setLocation] = useState(userLocation || { lat: 0, lng: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form with alert data when modal opens
  useEffect(() => {
    if (alert && isOpen) {
      setFormData({
        category: alert.category || 'emergency',
        title: alert.title || '',
        description: alert.description || '',
        severity: alert.severity || 'medium',
      });
      setLocation(alert.location || userLocation || { lat: 0, lng: 0 });
    }
  }, [alert, isOpen, userLocation]);

  const categories = [
    { value: 'emergency', label: '🚨 Emergency', color: 'red', icon: '🚨' },
    { value: 'safety', label: '⚠️ Safety Hazard', color: 'orange', icon: '⚠️' },
    { value: 'weather', label: '🌦️ Weather Alert', color: 'blue', icon: '🌦️' },
    { value: 'traffic', label: '🚦 Traffic Issue', color: 'yellow', icon: '🚦' },
    { value: 'other', label: '📢 Other', color: 'gray', icon: '📢' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;
    if (!alert) return;

    setIsSubmitting(true);
    try {
      await onUpdate(alert._id, {
        category: formData.category,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to update alert:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <span className="text-2xl sm:text-3xl">✏️</span>
              <span className="text-lg sm:text-2xl">Update Alert</span>
            </h2>
            <button
              onClick={onClose}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-full transition-colors`}
            >
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
              <div>
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 sm:mb-3`}>
                  Category
                </label>
                <div className="space-y-1 sm:space-y-2">
                  {categories.map(cat => (
                    <label key={cat.value} className={`flex items-center p-2 sm:p-3 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={formData.category === cat.value}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-lg sm:text-2xl mr-2 sm:mr-3">{cat.icon}</span>
                      <span className={`text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium flex-1`}>{cat.label}</span>
                      {formData.category === cat.value && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 sm:mb-3`}>
                  Severity Level
                </label>
                <div className="space-y-1 sm:space-y-2">
                  {[
                    { value: 'low', label: 'Low', color: 'green', icon: '🟢' },
                    { value: 'medium', label: 'Medium', color: 'yellow', icon: '🟡' },
                    { value: 'high', label: 'High', color: 'orange', icon: '🟠' },
                    { value: 'critical', label: 'Critical', color: 'red', icon: '🔴' }
                  ].map(sev => (
                    <label key={sev.value} className={`flex items-center p-2 sm:p-3 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="severity"
                        value={sev.value}
                        checked={formData.severity === sev.value}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="sr-only"
                      />
                      <span className="text-lg sm:text-xl mr-2 sm:mr-3">{sev.icon}</span>
                      <span className={`text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium flex-1`}>{sev.label}</span>
                      {formData.severity === sev.value && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2`}>
                Alert Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base`}
                placeholder="Brief description of the alert"
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2`}>
                Detailed Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm sm:text-base`}
                rows={3}
                placeholder="Provide detailed information about the alert..."
                required
              />
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'} rounded-xl p-3 sm:p-4 border ${theme === 'dark' ? 'border-gray-700' : 'border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📍</span>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                  Alert Location
                </span>
              </div>
              {location.lat !== 0 && location.lng !== 0 ? (
                <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-blue-800'}`}>
                  Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
                </div>
              ) : (
                <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-blue-600'} italic`}>
                  Getting your location...
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:flex-1 px-6 py-3 border-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-xl font-semibold transition-all text-sm sm:text-base`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  '✏️ Update Alert'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AlertCard: React.FC<{
  alert: Alert;
  onReport: (alertId: string) => void;
  onAddComment: (alertId: string) => void;
  onUpdate: (alert: Alert) => void;
  onDelete: (alertId: string) => void;
  currentUserId?: string;
  isOnline: boolean;
}> = ({ alert, onReport, onAddComment, onUpdate, onDelete, currentUserId, isOnline }) => {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'low': return { color: 'green', icon: '🟢', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200' };
      case 'medium': return { color: 'yellow', icon: '🟡', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-200' };
      case 'high': return { color: 'orange', icon: '🟠', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-200' };
      case 'critical': return { color: 'red', icon: '🔴', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200' };
      default: return { color: 'gray', icon: '⚪', bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-800 dark:text-gray-200' };
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'emergency': return { icon: '🚨', color: 'text-red-600 dark:text-red-400' };
      case 'safety': return { icon: '⚠️', color: 'text-orange-600 dark:text-orange-400' };
      case 'weather': return { icon: '🌦️', color: 'text-blue-600 dark:text-blue-400' };
      case 'traffic': return { icon: '🚦', color: 'text-yellow-600 dark:text-yellow-400' };
      default: return { icon: '📢', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const severityConfig = getSeverityConfig(alert.severity);
  const categoryConfig = getCategoryConfig(alert.category);
  const isOwnAlert = currentUserId === alert.userId;
  const isExpired = new Date(alert.expiresAt) < new Date();
  const timeAgo = new Date(alert.createdAt).toLocaleString();

  return (
    <div 
      id={`alert-${alert._id}`}
      className={`group p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl w-full max-w-full overflow-hidden ${
        isExpired 
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
          : `${severityConfig.bg} ${severityConfig.border} hover:scale-[1.02]`
      }`}
    >
      {/* Header section with severity, category, and status */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${severityConfig.bg} ${severityConfig.text} ${severityConfig.border} border-2`}>
            <span className="text-lg">{severityConfig.icon}</span>
            <span className="ml-2 hidden sm:inline">{alert.severity.toUpperCase()}</span>
            <span className="ml-2 sm:hidden">{alert.severity.charAt(0).toUpperCase()}</span>
          </div>
          <div className={`text-2xl sm:text-3xl ${categoryConfig.color}`}>
            {categoryConfig.icon}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!alert.synced && (
            <span className="px-3 py-1.5 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-sm font-semibold shadow-sm">
              📤 Queued
            </span>
          )}
          {isExpired && (
            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full text-sm font-semibold shadow-sm">
              ⏰ Expired
            </span>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight">{alert.title}</h3>
      <p className="text-base text-gray-700 dark:text-gray-300 mb-4 leading-relaxed line-clamp-3">{alert.description || 'No description provided.'}</p>
      
      {/* Metadata */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span className="font-medium">{alert.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🕒</span>
          <span>{new Date(alert.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Location */}
      {alert.location.address && (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
          <span className="text-lg">📍</span>
          <span className="truncate">{alert.location.address}</span>
        </div>
      )}

      {/* Comments Section */}
      {alert.comments && alert.comments.length > 0 && (
        <div className="mb-4 border-t border-gray-200 dark:border-gray-600 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-lg">💬</span>
            Comments ({alert.comments.length})
          </h4>
          <div className="space-y-3">
            {alert.comments.map((comment, index) => (
              <div
                key={index}
                className="comment-box bg-white dark:bg-white rounded-lg p-3 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold alert-comment-username" style={{ color: '#000000' }}>
                      {comment.username}
                    </span>
                  </div>
                  <span className="text-xs alert-comment-date" style={{ color: '#000000' }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm break-words alert-comment-text" style={{ color: '#000000' }}>
                  {comment.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        {alert.reportCount > 0 && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
            <span className="text-lg">⚠️</span>
            <span>{alert.reportCount} {alert.reportCount === 1 ? 'report' : 'reports'}</span>
          </div>
        )}
        
        <div className="flex gap-3 ml-auto">
           {!isOwnAlert && !isExpired && (
             <>
               <button
                 onClick={() => onAddComment(alert._id)}
                 className="px-5 py-2.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-500 border-2 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
               >
                 <span className="mr-2">💬</span>
                 Comment
               </button>
               <button
                 onClick={() => onReport(alert._id)}
                 className="px-5 py-2.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-500 border-2 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
               >
                 <span className="mr-2">🚨</span>
                 Report
               </button>
             </>
           )}
           {isOwnAlert && (
             <>
               <button
                 onClick={() => onUpdate(alert)}
                 className="px-5 py-2.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-500 border-2 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
               >
                 <span className="mr-2">✏️</span>
                 Update
               </button>
               <button
                 onClick={() => onDelete(alert._id)}
                 disabled={!isOnline}
                 className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md ${
                   isOnline 
                     ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-500 border-2 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-gray-700 cursor-pointer hover:shadow-lg' 
                     : 'text-gray-400 bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50'
                 }`}
                 title={!isOnline ? 'Cannot delete alerts while offline' : 'Delete this alert'}
               >
                 <span className="mr-2">🗑️</span>
                 Delete
               </button>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

const ReportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReport: (alertId: string) => void;
  alertId: string;
}> = ({ isOpen, onClose, onReport, alertId }) => {
  const { theme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReport(alertId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-fade-in ${theme === 'dark' ? 'border-2 border-gray-700' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-3xl">🚨</span>
            Report Alert
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to report this alert? This action cannot be undone.
          </p>

          <div className="flex gap-3 sm:flex-row flex-col">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              Report Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddCommentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (alertId: string, comment: string) => void;
  alertId: string;
}> = ({ isOpen, onClose, onAddComment, alertId }) => {
  const { theme } = useTheme();
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddComment(alertId, comment.trim());
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-fade-in ${theme === 'dark' ? 'border-2 border-gray-700' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-3xl">💬</span>
            Add Comment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Your Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your comment here... Share additional information, provide updates, or ask questions..."
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors resize-none h-32"
              maxLength={500}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {comment.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3 sm:flex-row flex-col">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Add Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AlertsPage() {
  const { user, isOnline, isLoading: isAuthLoading } = useAuth();
  const { alerts, isLoadingAlerts, createAlert, updateAlert, reportAlert, addComment, deleteAlert } = useAlerts();
  
  // Show loading state while authentication is being checked
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  const { theme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedReportAlertId, setSelectedReportAlertId] = useState<string>('');
  const [selectedCommentAlertId, setSelectedCommentAlertId] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.8065, 10.1815]); // Default to Tunis, Tunisia
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log('📍 Location detected:', { latitude, longitude, accuracy });
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationAccuracy(accuracy);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          console.log('📍 Using default location (Tunis, Tunisia)');
          // Default to Tunis, Tunisia instead of New York
          setMapCenter([36.8065, 10.1815]); // Tunis, Tunisia
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterCategory && alert.category !== filterCategory) return false;
    if (filterSeverity && alert.severity !== filterSeverity) return false;
    if (alert.status !== 'active') return false;
    if (alert.hidden) return false;
    if (new Date(alert.expiresAt) < new Date()) return false;
    return true;
  });

  const handleCreateAlert = async (alertData: any) => {
    try {
      const createPayload = {
        latitude: alertData.location.lat,
        longitude: alertData.location.lng,
        category: alertData.category,
        title: alertData.title,
        description: alertData.description,
        severity: alertData.severity,
        ttlHours: alertData.ttlHours,
        location: alertData.location
      };
      
      await createAlert(createPayload);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleOpenUpdateModal = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowUpdateModal(true);
  };

  const handleUpdateAlert = async (alertId: string, alertData: any) => {
    try {
      await updateAlert(alertId, alertData);
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const handleOpenReportModal = (alertId: string) => {
    setSelectedReportAlertId(alertId);
    setShowReportModal(true);
  };

  const handleReportAlert = async (alertId: string) => {
    try {
      await reportAlert(alertId);
    } catch (error) {
      console.error('Failed to report alert:', error);
    }
  };

  const handleOpenCommentModal = (alertId: string) => {
    setSelectedCommentAlertId(alertId);
    setShowCommentModal(true);
  };

  const handleAddComment = async (alertId: string, comment: string) => {
    try {
      await addComment(alertId, comment);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Please log in to view community alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-x-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-full">
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6`}>
          <div className="flex flex-col gap-4">
            <div className="text-center sm:text-left">
              <h1 className={`text-2xl sm:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2 sm:gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-3xl sm:text-4xl">🚨</span>
                <span className="text-lg sm:text-3xl">Community Alerts</span>
              </h1>
              <p className={`mt-2 text-sm sm:text-base text-center sm:text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Stay informed about local incidents and emergencies</p>
            </div>
            <div className="flex justify-center sm:justify-start">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transition-all text-base sm:text-sm"
                style={{ color: '#ffffff' }}
              >
                🚨 Create Alert
              </button>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6`}>
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="">🔍 All Categories</option>
                <option value="emergency">🚨 Emergency</option>
                <option value="safety">⚠️ Safety Hazard</option>
                <option value="weather">🌦️ Weather Alert</option>
                <option value="traffic">🚦 Traffic Issue</option>
                <option value="other">📢 Other</option>
              </select>
              
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className={`w-full px-3 py-3 sm:py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="">⚡ All Severities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex flex-col gap-3 sm:gap-3 sm:flex-row sm:items-center">
              <div className={`flex gap-2 ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'} rounded-xl p-1.5 w-full sm:w-auto shadow-md`}>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base flex items-center justify-center gap-2 ${
                    viewMode === 'map' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 hover:shadow-md border border-transparent'
                  }`}
                >
                  <span className="text-lg">🗺️</span>
                  <span>Map</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base flex items-center justify-center gap-2 ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 hover:shadow-md border border-transparent'
                  }`}
                >
                  <span className="text-lg">📋</span>
                  <span>List</span>
                </button>
              </div>
              
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    console.log('📍 Manually refreshing location...');
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        console.log('📍 New location:', { latitude, longitude, accuracy });
                        setUserLocation({ lat: latitude, lng: longitude });
                        setLocationAccuracy(accuracy);
                        setMapCenter([latitude, longitude]);
                      },
                      (error) => {
                        console.error('Error getting location:', error);
                        alert('Failed to get your location. Please ensure location permissions are enabled.');
                      },
                      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                  }
                }}
                className="px-5 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-bold transition-all duration-300 text-sm sm:text-base flex items-center gap-2 justify-center shadow-lg hover:shadow-xl hover:scale-105 border border-green-500"
              >
                <span className="text-lg">📍</span>
                <span>Update My Location</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Map */}
          {viewMode === 'map' && (
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl shadow-xl overflow-hidden`} style={{ height: '400px', minHeight: '300px', position: 'relative' }}>
              {/* Floating "My Location" Button */}
              {userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && (
                <button
                  onClick={() => {
                    setMapCenter([userLocation.lat, userLocation.lng]);
                  }}
                  className="absolute top-4 right-4 z-50 bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 font-bold text-sm"
                  title="Center map on your location"
                >
                  <span className="text-xl">📍</span>
                  <span className="hidden sm:inline">My Location</span>
                </button>
              )}
               {typeof window !== 'undefined' && (
                 <MapContainer
                   key={`map-${mapCenter[0]}-${mapCenter[1]}`}
                   center={mapCenter}
                   zoom={13}
                   className="h-full w-full rounded-xl sm:rounded-2xl"
                   style={{ height: '100%', width: '100%', zIndex: 1 }}
                 >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* User's current location marker */}
                  {userLocation && (() => {
                    const L = require('leaflet');
                    const userLocationIcon = L.divIcon({
                      className: 'custom-marker',
                      html: `<div style="
                        background-color: #2563eb;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 14px;
                        font-weight: bold;
                      ">📍</div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    });

                    return (
                      <>
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-bold text-gray-900 mb-1 text-sm">📍 Your Location</h3>
                              <p className="text-xs text-gray-600">
                                {locationAccuracy && `Accuracy: ±${Math.round(locationAccuracy)}m`}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                        {locationAccuracy && (
                          <Circle 
                            center={[userLocation.lat, userLocation.lng]} 
                            radius={locationAccuracy}
                            pathOptions={{ 
                              color: '#2563eb', 
                              fillColor: '#2563eb',
                              fillOpacity: 0.15,
                              weight: 2
                            }} 
                          />
                        )}
                      </>
                    );
                  })()}
                  
                  {filteredAlerts.map(alert => {
                    // Create custom icon based on severity
                    const L = require('leaflet');
                    const severityColors = {
                      low: '#22c55e',      // green
                      medium: '#eab308',   // yellow
                      high: '#f97316',     // orange
                      critical: '#ef4444'  // red
                    };
                    
                    // Get category icon
                    const getCategoryIcon = (cat: string) => {
                      switch(cat) {
                        case 'emergency': return '🚨';
                        case 'safety': return '⚠️';
                        case 'weather': return '🌦️';
                        case 'traffic': return '🚦';
                        default: return '📢';
                      }
                    };

                    const categoryIcon = getCategoryIcon(alert.category);

                    const customIcon = L.divIcon({
                      className: 'custom-marker',
                      html: `<div style="
                        background-color: ${severityColors[alert.severity] || '#6b7280'};
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        cursor: pointer;
                      ">${categoryIcon}</div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16]
                    });

                    const getSeverityIcon = (sev: string) => {
                      switch(sev) {
                        case 'critical': return '🔴';
                        case 'high': return '🟠';
                        case 'medium': return '🟡';
                        default: return '🟢';
                      }
                    };

                    return (
                      <Marker
                        key={alert._id}
                        position={[alert.location.lat, alert.location.lng]}
                        icon={customIcon}
                      >
                        <Popup maxWidth={300}>
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[250px]">
                            {/* Header with severity and category icons */}
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                              <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
                              <span className="text-xl">{getCategoryIcon(alert.category)}</span>
                              <div className="flex-1 flex items-center justify-between">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {alert.severity.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Title */}
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-base line-clamp-1">{alert.title}</h3>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">{alert.description || 'No description available'}</p>
                            
                            {/* Footer with username and time */}
                            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-1">
                                <span>👤</span>
                                <span>{alert.username}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>🕒</span>
                                <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            {/* Clickable button to view full alert */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                // Switch to list view
                                setViewMode('list');
                                // Scroll to the alert element
                                setTimeout(() => {
                                  const alertElement = document.getElementById(`alert-${alert._id}`);
                                  if (alertElement) {
                                    alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // Highlight it briefly
                                    alertElement.classList.add('ring-4', 'ring-blue-500', 'transition-all');
                                    setTimeout(() => {
                                      alertElement.classList.remove('ring-4', 'ring-blue-500');
                                    }, 2000);
                                  }
                                }, 100);
                              }}
                              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <span>👁️</span>
                              <span>View Full Details</span>
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          )}

          {/* Alerts List */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl shadow-xl overflow-hidden`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-2xl">📋</span>
                  <span>Recent Alerts</span>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredAlerts.length}
                  </span>
                </h2>
              </div>
            </div>
            
            {isLoadingAlerts ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading alerts...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="text-5xl sm:text-6xl mb-4">🔍</div>
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No alerts found</h3>
                <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No alerts match your current filters.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '400px' }}>
                <div className="space-y-4 sm:space-y-6">
                  {filteredAlerts.map(alert => (
                    <AlertCard
                      key={alert._id}
                      alert={alert}
                      onReport={handleOpenReportModal}
                      onAddComment={handleOpenCommentModal}
                      onUpdate={handleOpenUpdateModal}
                      onDelete={handleDeleteAlert}
                      currentUserId={user.id}
                      isOnline={isOnline}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateAlert}
        userLocation={userLocation || undefined}
      />

      <AlertUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onUpdate={handleUpdateAlert}
        alert={selectedAlert}
        userLocation={userLocation || undefined}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={handleReportAlert}
        alertId={selectedReportAlertId}
      />

      <AddCommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onAddComment={handleAddComment}
        alertId={selectedCommentAlertId}
      />
    </div>
  );
}