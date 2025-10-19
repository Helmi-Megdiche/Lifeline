"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { saveStatus, queueStatus, type CheckInStatus } from "@/lib/indexedDB";
import { usePouchDB } from "@/hooks/usePouchDB";
import { saveStatusToPouch as upsertSingleStatus } from "@/lib/pouchdb";
import { useAuth } from "@/contexts/ClientAuthContext";
import { getApiUrl, API_CONFIG } from "@/lib/config";

const AUTO_HIDE_MS = 3000;

export default function Home() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [locationDenied, setLocationDenied] = useState<boolean>(false);
  const { isClient, localDB } = usePouchDB();
  const { user, token } = useAuth();

  const saveStatusToPouch = async (status: {
    status: 'safe' | 'help';
    timestamp: number;
    latitude?: number;
    longitude?: number;
    userId?: string;
  }) => {
    if (!localDB || !user?.id) {
      console.error('Cannot save to PouchDB: DB not ready or user missing');
      return;
    }
    console.log('Saving to PouchDB (single-doc model):', status);
    return upsertSingleStatus({
      status: status.status,
      timestamp: status.timestamp,
      latitude: status.latitude,
      longitude: status.longitude,
      userId: user.id,
    });
  };

  async function buildPayload(status: "safe" | "help"): Promise<CheckInStatus> {
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 7000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch (err: any) {
      // Permission denied or timeout → proceed without coords and mark
      setLocationDenied(true);
    }
    return {
      status,
      timestamp: Date.now(),
      latitude,
      longitude,
      userId: user?.id
    };
  } 
  

  async function isReallyOnline(): Promise<boolean> {
    // More reliable online check - try to actually reach the server
    try {
      const response = await fetch('http://localhost:4004/health', { method: "GET", cache: "no-cache" });
      return response.ok;
    } catch {
      return false;
    }
  }

  const handleStatusSave = async (status: "safe" | "help") => {
    setIsSaving(true);
    setLocationDenied(false);
    const payload: CheckInStatus = await buildPayload(status);
    
    console.log('Payload being sent:', payload);
    console.log('Payload status type:', typeof payload.status);
    console.log('Payload timestamp type:', typeof payload.timestamp);
    
            try {
              // Save to both IndexedDB (legacy) and PouchDB (new)
              const clean = {
                status: payload.status,
                timestamp: payload.timestamp,
                latitude: payload.latitude ?? undefined,
                longitude: payload.longitude ?? undefined,
                userId: user?.id,
              } as const;
              await Promise.all([
                saveStatus(payload),
                isClient && localDB ? saveStatusToPouch(clean) : Promise.resolve()
              ]);

          const isOnline = await isReallyOnline();
          // Do not POST directly; rely on PouchDB replication to avoid duplicates
          if (!isOnline) {
            await queueStatus(payload);
          }
          setMessage(isOnline ? "Status saved (sync in progress)" : "Status saved offline - will sync when online");

          localStorage.setItem("lifeline:lastStatus", JSON.stringify({ ...payload, synced: isOnline }));
          setTimeout(() => setMessage(null), AUTO_HIDE_MS);
        } catch (e) {
          console.error('Error saving status:', e);
          setMessage("Failed to save status");
        } finally {
          setIsSaving(false);
        }
      };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
          <span className="text-white font-bold text-2xl">L</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
          Emergency Check-In
        </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Stay connected with responders. Your status saves offline and syncs automatically when back online.
            </p>
            {user && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full text-sm text-green-700 border border-green-200">
                <span className="text-green-600">👤</span>
                Welcome, {user.username}
              </div>
            )}
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-200/60 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm text-blue-700 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Location helps responders find you
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-lg mx-auto">
          <button
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-8 px-6 sm:py-6 sm:px-8 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:transform-none min-h-[80px] sm:min-h-[120px]"
            id="btn-safe"
            disabled={isSaving}
            onClick={() => handleStatusSave("safe")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            {isSaving ? (
              <span className="inline-flex items-center gap-3">
                <span className="inline-block h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                I'm Safe
              </span>
            )}
          </button>
          <button
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-8 px-6 sm:py-6 sm:px-8 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:transform-none min-h-[80px] sm:min-h-[120px]"
            id="btn-help"
            disabled={isSaving}
            onClick={() => handleStatusSave("help")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            {isSaving ? (
              <span className="inline-flex items-center gap-3">
                <span className="inline-block h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">⚠</span>
                Need Help
              </span>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="max-w-lg mx-auto mb-6 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 p-4 shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            {message}
          </div>
        </div>
      )}
      
      {locationDenied && (
        <div className="max-w-lg mx-auto mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 p-4 shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-amber-600">⚠</span>
            Location not granted. Status saved without coordinates.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Link href="/resources" className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] block">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏥</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Emergency Resources</h2>
          </div>
          <p className="text-gray-600 mb-4">Find nearby hospitals, shelters, police stations, and fire departments with offline access.</p>
          <div className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
            Browse Resources →
          </div>
        </Link>
        
        <Link href="/guides" className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] block">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Emergency Guides</h2>
          </div>
          <p className="text-gray-600 mb-4">Step-by-step instructions for CPR, first aid, and other emergency procedures.</p>
          <div className="text-green-600 font-medium group-hover:text-green-700 transition-colors">
            View Guides →
          </div>
        </Link>
      </div>
    </div>
  );
}
