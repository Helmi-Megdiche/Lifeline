"use client";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { setupLeafletDefaultIcon } from "@/lib/leafletIcons";
import { useTheme } from "@/contexts/ThemeContext";

const Map = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false }) as any;
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then(m => (m as any).Circle), { ssr: false }) as any;

export default function LiveMapPage() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setupLeafletDefaultIcon().catch(() => {});
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }
    
    // Check if we're on HTTPS or localhost (required for geolocation on mobile)
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecureContext) {
      setError('Geolocation requires HTTPS. Please use https://10.133.250.197:3000 on mobile');
      return;
    }
    
    let watchId: number | null = null;
    navigator.geolocation.getCurrentPosition((p) => {
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      setAccuracy(p.coords.accuracy || null);
    }, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError('Location permission denied. Please enable location access in your browser settings.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setError('Location unavailable. Please check your GPS/WiFi settings.');
      } else {
        setError('Location error: ' + err.message);
      }
    }, { enableHighAccuracy: true, timeout: 8000 });
    
    watchId = navigator.geolocation.watchPosition((p) => {
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      setAccuracy(p.coords.accuracy || null);
    }, (e) => {
      if (e.code === e.PERMISSION_DENIED) {
        setError('Location permission denied. Please enable location access in your browser settings.');
      } else if (e.code === e.POSITION_UNAVAILABLE) {
        setError('Location unavailable. Please check your GPS/WiFi settings.');
      } else {
        setError(e.message || 'Location error');
      }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-emergency-green-500 dark:to-emergency-green-600 rounded-2xl mb-3 shadow-lg">
          <span className="text-white text-2xl">📍</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-dark-text-primary dark:to-dark-text-secondary bg-clip-text text-transparent">Live Location</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mt-2">Your current location updates in real time. Works offline after first load of tiles.</p>
        {error && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div className="flex items-center justify-center gap-2 mt-3">
          {/* Save tiles for offline */}
          <button
            disabled={!pos || isPrefetching}
            onClick={async () => {
              if (!pos) return;
              setIsPrefetching(true);
              try {
                const zLevels = [12, 13, 14, 15];
                const neighbors = [-1, 0, 1];
                const toTile = (latDeg: number, lonDeg: number, zoom: number) => {
                  const x = Math.floor(((lonDeg + 180) / 360) * Math.pow(2, zoom));
                  const y = Math.floor(((1 - Math.log(Math.tan((latDeg * Math.PI) / 180) + 1 / Math.cos((latDeg * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom));
                  return { x, y };
                };
                const requests: Promise<Response>[] = [];
                for (const z of zLevels) {
                  const { x, y } = toTile(pos.lat, pos.lng, z);
                  for (const dx of neighbors) for (const dy of neighbors) {
                    const url = `https://a.tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`;
                    requests.push(fetch(url, { mode: 'no-cors', cache: 'reload' }));
                  }
                }
                await Promise.allSettled(requests);
              } finally {
                setIsPrefetching(false);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 disabled:bg-blue-300 text-white"
          >
            ⬇️ Save tiles for offline
          </button>
          {/* Share my live location */}
          <button
            disabled={!pos}
            onClick={async () => {
              if (!pos) return;
              const url = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
              const text = `My live location: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}\n${url}`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'My Location - LifeLine', text, url });
                } else if (navigator.clipboard) {
                  await navigator.clipboard.writeText(text);
                  alert('Location copied to clipboard');
                } else {
                  window.open(url, '_blank');
                }
              } catch {}
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-emerald-600 disabled:bg-emerald-300 text-white"
          >
            🔗 Share my live location
          </button>
          {/* Open in Apple/Google Maps */}
          <button
            disabled={!pos}
            onClick={() => {
              if (!pos) return;
              const isApple = /iPad|iPhone|Mac/i.test(navigator.userAgent);
              const gmaps = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
              const apple = `http://maps.apple.com/?ll=${pos.lat},${pos.lng}`;
              window.open(isApple ? apple : gmaps, '_blank');
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 border border-gray-200"
          >
            🗺️ Open in Maps
          </button>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-gray-200/60 shadow-lg">
        <div style={{ height: 420 }}>
          {pos ? (
            <Map center={[pos.lat, pos.lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[pos.lat, pos.lng]} />
              {accuracy && <Circle center={[pos.lat, pos.lng]} radius={accuracy} pathOptions={{ color: '#2563eb', fillOpacity: 0.1 }} />}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">Locating…</div>
          )}
        </div>
      </div>
    </div>
  );
}


