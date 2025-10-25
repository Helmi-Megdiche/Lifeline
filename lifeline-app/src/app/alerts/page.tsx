"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useAlerts } from '@/contexts/AlertsContext';
import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(mod => mod.default), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

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
}

const AlertCreateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (alertData: any) => void;
  userLocation?: { lat: number; lng: number };
}> = ({ isOpen, onClose, onCreate, userLocation }) => {
  const [formData, setFormData] = useState({
    category: 'emergency',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    ttlHours: 24
  });
  const [location, setLocation] = useState(userLocation || { lat: 0, lng: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-3xl">🚨</span>
              Create Alert
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Category
                </label>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={formData.category === cat.value}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-3">{cat.icon}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{cat.label}</span>
                      {formData.category === cat.value && (
                        <svg className="w-5 h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Severity Level
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'low', label: 'Low', color: 'green', icon: '🟢' },
                    { value: 'medium', label: 'Medium', color: 'yellow', icon: '🟡' },
                    { value: 'high', label: 'High', color: 'orange', icon: '🟠' },
                    { value: 'critical', label: 'Critical', color: 'red', icon: '🔴' }
                  ].map(sev => (
                    <label key={sev.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        name="severity"
                        value={sev.value}
                        checked={formData.severity === sev.value}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="sr-only"
                      />
                      <span className="text-xl mr-3">{sev.icon}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{sev.label}</span>
                      {formData.severity === sev.value && (
                        <svg className="w-5 h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Alert Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Brief description of the alert"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Detailed Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="Provide detailed information about the alert..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="168"
                  value={formData.ttlHours}
                  onChange={(e) => setFormData({ ...formData, ttlHours: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-lg font-semibold min-w-[80px] text-center">
                  {formData.ttlHours}h
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1 hour</span>
                <span>1 week</span>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl"
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

const AlertCard: React.FC<{
  alert: Alert;
  onReport: (alertId: string) => void;
  onDelete: (alertId: string) => void;
  currentUserId?: string;
  isOnline: boolean;
}> = ({ alert, onReport, onDelete, currentUserId, isOnline }) => {
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
    <div className={`p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
      isExpired 
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
        : `${severityConfig.bg} ${severityConfig.border} hover:scale-[1.02]`
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${severityConfig.bg} ${severityConfig.text} ${severityConfig.border} border`}>
            {severityConfig.icon} {alert.severity.toUpperCase()}
          </div>
          <div className={`text-lg ${categoryConfig.color}`}>
            {categoryConfig.icon}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!alert.synced && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-xs font-semibold">
              📤 Queued
            </span>
          )}
          {isExpired && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs font-semibold">
              ⏰ Expired
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{alert.title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{alert.description}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <span className="font-semibold">👤</span>
          {alert.username}
        </span>
        <span className="flex items-center gap-1">
          <span className="font-semibold">🕒</span>
          {timeAgo}
        </span>
      </div>

      {alert.location.address && (
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
          <span>📍</span>
          {alert.location.address}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {alert.reportCount > 0 && (
            <span className="flex items-center gap-1">
              <span>⚠️</span>
              {alert.reportCount} reports
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isOwnAlert && !isExpired && (
            <button
              onClick={() => onReport(alert._id)}
              className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-semibold transition-colors"
            >
              🚨 Report
            </button>
          )}
          {isOwnAlert && (
            <button
              onClick={() => onDelete(alert._id)}
              disabled={!isOnline}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                isOnline 
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer' 
                  : 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
              }`}
              title={!isOnline ? 'Cannot delete alerts while offline' : 'Delete this alert'}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AlertsPage() {
  console.log('🚨🚨🚨 ALERTS PAGE COMPONENT RENDERED! 🚨🚨🚨');
  console.log('🚨🚨🚨 ALERTS PAGE COMPONENT RENDERED! 🚨🚨🚨');
  console.log('🚨🚨🚨 ALERTS PAGE COMPONENT RENDERED! 🚨🚨🚨');
  
  const { user, isOnline } = useAuth();
  console.log('🚨🚨🚨 ALERTS PAGE LOADED - isOnline:', isOnline);
  console.log('🚨🚨🚨 ALERTS PAGE LOADED - user:', user);
  
  const { alerts, isLoadingAlerts, createAlert, reportAlert, deleteAlert, manualSyncAlerts } = useAlerts();
  const { theme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const mapRef = useRef<any>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a central location
          setMapCenter([40.7128, -74.0060]); // New York City
        }
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
      console.log('🚨🚨🚨 CREATING ALERT WITH DATA! 🚨🚨🚨');
      console.log('📝 Alert data received:', alertData);
      
      // Transform the data to match CreateAlertPayload interface
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
      
      console.log('📝 Transformed payload:', createPayload);
      await createAlert(createPayload);
      console.log('✅ Alert creation completed');
    } catch (error) {
      console.error('❌ Failed to create alert:', error);
    }
  };

  const handleReportAlert = async (alertId: string) => {
    try {
      await reportAlert(alertId);
    } catch (error) {
      console.error('Failed to report alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleMapMove = () => {
    if (mapRef.current) {
      const map = mapRef.current;
      const bounds = map.getBounds();
      setMapBounds({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast()
      });
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-4xl">🚨</span>
                Community Alerts
              </h1>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Stay informed about local incidents and emergencies</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  alert('SYNC BUTTON CLICKED!');
                  console.log('🚨🚨🚨 SYNC BUTTON CLICKED! 🚨🚨🚨');
                  console.log('🚨🚨🚨 SYNC BUTTON CLICKED! 🚨🚨🚨');
                  console.log('🚨🚨🚨 SYNC BUTTON CLICKED! 🚨🚨🚨');
                  console.log('🚨🚨🚨 isOnline:', isOnline);
                  console.log('🚨🚨🚨 Calling manualSyncAlerts... 🚨🚨🚨');
                  manualSyncAlerts();
                }}
                disabled={false}
                style={{ backgroundColor: 'red', color: 'white', padding: '10px', fontSize: '20px', cursor: 'pointer' }}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  isOnline 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                🔄 SYNC BUTTON TEST
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                🚨 Create Alert
              </button>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
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
                className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
              >
                <option value="">⚡ All Severities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'map' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🗺️ Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                📋 List
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          {viewMode === 'map' && (
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden`} style={{ height: '600px' }}>
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                  whenReady={() => handleMapMove()}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  <MarkerClusterGroup>
                    {filteredAlerts.map(alert => {
                      // Create custom icon based on severity
                      const L = require('leaflet');
                      const severityColors = {
                        low: '#22c55e',      // green
                        medium: '#eab308',   // yellow
                        high: '#f97316',     // orange
                        critical: '#ef4444'  // red
                      };
                      
                      const customIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="
                          background-color: ${severityColors[alert.severity] || '#6b7280'};
                          width: 20px;
                          height: 20px;
                          border-radius: 50%;
                          border: 2px solid white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-size: 12px;
                          font-weight: bold;
                        ">${alert.severity === 'critical' ? '!' : alert.severity === 'high' ? 'H' : alert.severity === 'medium' ? 'M' : 'L'}</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      });

                      return (
                        <Marker
                          key={alert._id}
                          position={[alert.location.lat, alert.location.lng]}
                          icon={customIcon}
                        >
                          <Popup>
                            <div className="p-3 min-w-[200px]">
                              <h3 className="font-bold text-gray-900 mb-2">{alert.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                              <div className="text-xs text-gray-500">
                                by {alert.username} • {alert.severity} • {alert.category}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>
                </MapContainer>
              )}
            </div>
          )}

          {/* Alerts List */}
          <div className={`space-y-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <span>📋</span>
                Recent Alerts
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm font-semibold">
                  {filteredAlerts.length}
                </span>
              </h2>
            </div>
            
            {isLoadingAlerts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading alerts...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl`}>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No alerts found</h3>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No alerts match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredAlerts.map(alert => (
                  <AlertCard
                    key={alert._id}
                    alert={alert}
                    onReport={handleReportAlert}
                    onDelete={handleDeleteAlert}
                    currentUserId={user.id}
                    isOnline={isOnline}
                  />
                ))}
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
    </div>
  );
}
