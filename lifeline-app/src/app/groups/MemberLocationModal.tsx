'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { setupLeafletDefaultIcon } from '@/lib/leafletIcons';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

export default function MemberLocationModal({
  onClose,
  username,
  coords,
  updatedAt,
}: {
  onClose: () => void;
  username: string;
  coords: { lat: number; lng: number } | null;
  updatedAt?: string | number | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { 
    setMounted(true); 
    setupLeafletDefaultIcon().catch(() => {});
    setTimeout(() => { try { window.dispatchEvent(new Event('resize')); } catch {} }, 60);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl card-surface rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{username}'s Location</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {coords ? (
          <div className="space-y-3">
            <div className="h-80 overflow-hidden rounded-lg">
              {mounted && (
                <MapContainer center={[coords.lat, coords.lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <Marker position={[coords.lat, coords.lng]} />
                </MapContainer>
              )}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {updatedAt ? (
                <span>Last updated: {new Date(updatedAt).toLocaleString()}</span>
              ) : (
                <span>Last known location</span>
              )}
              <a className="ml-3 text-blue-600 dark:text-blue-400 hover:underline" href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer">Open in Google Maps</a>
            </div>
          </div>
        ) : (
          <div className="text-gray-600 dark:text-gray-400">No location shared for this member yet.</div>
        )}
      </div>
    </div>
  );
}


