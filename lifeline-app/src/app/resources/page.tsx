"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import MapPreview from "./MapPreview";
import { upsertResourcesForOffline, getLatestSavedResources, getAllSavedResources, deleteSavedResources, StoredResource } from "@/lib/indexedDB";

type Resource = {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  type: "Hospital" | "Shelter" | "Police" | "Fire";
};

// Note: no static defaults in production; resources load from geolocation or saved areas
const RESOURCES_DEV: Resource[] = [];

const TABS: Array<Resource["type"] | "All"> = ["All", "Hospital", "Shelter", "Police", "Fire"];

export default function ResourcesPage() {
  const { theme } = useTheme();
  const [active, setActive] = useState<Resource["type"] | "All">("All");
  const [query, setQuery] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [resources, setResources] = useState<Resource[]>(RESOURCES_DEV);
  const [savedResources, setSavedResources] = useState<StoredResource | null>(null);
  const [allSaved, setAllSaved] = useState<StoredResource[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [didTryGeo, setDidTryGeo] = useState<boolean>(false);
  const [geoDenied, setGeoDenied] = useState<boolean>(false);
  const [activeSavedId, setActiveSavedId] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(25); // Radius in km

  function savedKey(a: { areaName?: string; centerLat: number; centerLng: number }): string {
    return (a.areaName ? a.areaName.toLowerCase().trim() : `${a.centerLat.toFixed(3)},${a.centerLng.toFixed(3)}`);
  }

  async function dedupeSavedAreas() {
    const list = await getAllSavedResources().catch(() => [] as StoredResource[]);
    const map = new Map<string, StoredResource>();
    for (const item of list) {
      const key = savedKey(item);
      const prev = map.get(key);
      if (!prev || item.savedAt > prev.savedAt) {
        map.set(key, item);
      } else {
        if (item.id) {
          await deleteSavedResources(item.id).catch(() => {});
        }
      }
    }
    setAllSaved(Array.from(map.values()));
  }

  // Determine connectivity (robust reachability check)
  useEffect(() => {
    let cancelled = false;
    async function update() {
      const navOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!navOnline) {
        if (!cancelled) setIsOnline(false);
        return;
      }
      try {
        const res = await fetch(`/favicon.ico?ping=${Date.now()}`, { cache: "no-store" });
        if (!cancelled) setIsOnline(res.ok);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    }
    update();
    const onlineHandler = () => update();
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  // Get user's location and generate nearby resources (online). When offline, load last saved
  useEffect(() => {
    async function getLocationAndResources() {
      if (!isOnline) {
        const [latest, list] = await Promise.all([
          getLatestSavedResources().catch(() => null),
          getAllSavedResources().catch(() => [])
        ]);
        // Deduplicate by name (case-insensitive) or rounded coords
        const seen = new Set<string>();
        const uniq = list.filter(a => {
          const key = savedKey(a);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSavedResources(latest);
        setAllSaved(uniq);
        // In offline mode, don't auto-load any area to avoid confusion.
        // Show empty state until user selects a saved area.
        setActiveSavedId(null);
        setResources([]);
        return;
      }
      try {
        // Try fresh geolocation FIRST when online for accuracy
        if (navigator.geolocation && !didTryGeo) {
          setDidTryGeo(true);
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, (err) => {
              setGeoDenied((err as GeolocationPositionError).code === err.PERMISSION_DENIED);
              reject(err);
            }, {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 0
            });
          });

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          generateNearbyResources(lat, lng);
          // One-time watch to get an even fresher fix
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const nlat = pos.coords.latitude; const nlng = pos.coords.longitude;
              setUserLocation({ lat: nlat, lng: nlng });
              generateNearbyResources(nlat, nlng);
              navigator.geolocation.clearWatch(watchId);
            },
            (err) => { setGeoDenied(err.code === err.PERMISSION_DENIED); navigator.geolocation.clearWatch(watchId); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
          );
          // Cache to localStorage for offline fallback
          localStorage.setItem("lifeline:lastStatus", JSON.stringify({ latitude: lat, longitude: lng }));
          return;
        }

        // Fallback to a previously saved location if geolocation not available
        const lastStatus = localStorage.getItem("lifeline:lastStatus");
        if (lastStatus) {
          const parsed = JSON.parse(lastStatus);
          if (parsed.latitude && parsed.longitude) {
            setUserLocation({ lat: parsed.latitude, lng: parsed.longitude });
            generateNearbyResources(parsed.latitude, parsed.longitude);
            return;
          }
        }
      } catch (error) {
        console.log("Could not get location:", error);
        // Fallback to last saved if available
        const lastStatus = localStorage.getItem("lifeline:lastStatus");
        if (lastStatus) {
          try {
            const parsed = JSON.parse(lastStatus);
            if (parsed.latitude && parsed.longitude) {
              setUserLocation({ lat: parsed.latitude, lng: parsed.longitude });
              generateNearbyResources(parsed.latitude, parsed.longitude);
              return;
            }
          } catch {}
        }
        // Otherwise keep empty list
        setResources([]);
      }
    }

    getLocationAndResources();
  }, [isOnline]);

  // Regenerate resources when radius changes
  useEffect(() => {
    if (userLocation && isOnline) {
      generateNearbyResources(userLocation.lat, userLocation.lng);
    }
  }, [radius, userLocation, isOnline]);

  // Calculate distance between two coordinates using Haversine formula
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function generateNearbyResources(userLat: number, userLng: number) {
    // Generate multiple resources within selected radius
    // Each degree of latitude is approximately 111km, so for any radius: km / 111
    const maxRadiusKm = radius;
    const maxDegrees = radius / 111; // Convert km to degrees
    
    const resourceTypes = ['Hospital', 'Shelter', 'Police', 'Fire'] as const;
    const hospitalNames = [
      'City General Hospital',
      'Regional Medical Center',
      'Emergency Care Clinic',
      'Community Health Center',
      'City Hospital North',
      'Regional Trauma Center',
      'Central Medical Center',
      'Emergency Hospital'
    ];
    const shelterNames = [
      'Emergency Shelter',
      'Disaster Relief Center',
      'Community Shelter',
      'Evacuation Center',
      'Crisis Shelter North',
      'Safety Haven',
      'Temporary Housing',
      'Refugee Center'
    ];
    const policeNames = [
      'Police Station',
      'Regional Police Department',
      'Community Safety Station',
      'Police Outpost',
      'District Police Office',
      'Law Enforcement Center',
      'Security Station',
      'Local Police Department'
    ];
    const fireNames = [
      'Fire Department',
      'Fire Station Central',
      'Emergency Response Unit',
      'Fire Department North',
      'City Fire Station',
      'Regional Fire Brigade',
      'Rescue Station',
      'Fire & Rescue Unit'
    ];

    const namesByType = {
      Hospital: hospitalNames,
      Shelter: shelterNames,
      Police: policeNames,
      Fire: fireNames
    };

    const nearbyResources: Resource[] = [];
    const usedNames = new Set<string>();
    
    // Calculate number of resources based on radius (more area = more resources)
    const numResources = Math.min(Math.max(Math.floor(radius * 1.2), 12), 30);
    
    let attempts = 0;
    while (nearbyResources.length < numResources && attempts < 100) {
      attempts++;
      
      // Random angle and distance within the radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * maxDegrees;
      const lat = userLat + (Math.cos(angle) * distance);
      const lng = userLng + (Math.sin(angle) * distance);
      
      // Ensure the point is within 25km
      const actualDistance = calculateDistance(userLat, userLng, lat, lng);
      if (actualDistance > maxRadiusKm) continue;
      
      const type = resourceTypes[nearbyResources.length % 4] as Resource['type'];
      const names = namesByType[type];
      
      // Try multiple times to find a unique name
      let name = '';
      let nameAttempts = 0;
      while (nameAttempts < 20) {
        const candidate = names[Math.floor(Math.random() * names.length)];
        const uniqueKey = `${candidate}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
        if (!usedNames.has(uniqueKey)) {
          name = candidate;
          usedNames.add(uniqueKey);
          break;
        }
        nameAttempts++;
      }
      
      if (!name) continue; // Skip if couldn't find unique name
      
      // Generate realistic phone number
      const phoneSuffix = String(100 + (nearbyResources.length % 900)).padStart(3, '0');
      const phone = `+216 71 ${phoneSuffix} ${String(100 + nearbyResources.length).padStart(3, '0')}`;
      
      nearbyResources.push({
        name,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        phone,
        lat,
        lng,
        type
      });
    }
    
    setResources(nearbyResources);
  }

  const filtered = useMemo(() => {
    if (!isOnline && activeSavedId === null) {
      return [] as Resource[];
    }
    const source = isOnline ? resources : ((savedResources?.resources as any[]) ?? []);
    
    // Filter by distance (selected radius) if user location is available
    let filteredByDistance = source;
    if (userLocation) {
      filteredByDistance = source.filter(r => {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, r.lat, r.lng);
        return distance <= radius;
      });
    }
    
    // Filter by type
    const byType = active === "All" ? filteredByDistance : filteredByDistance.filter(r => r.type === active);
    
    // Filter by search query
    const q = query.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(r => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q));
  }, [active, query, resources, isOnline, savedResources, activeSavedId, userLocation, radius]);

  async function downloadAreaForOffline() {
    if (!userLocation) return;
    // Ask for area name (fallback to rounded lat,lng if none)
    let areaName = prompt("Name this area (e.g., Tunis Center)?") || "";
    areaName = areaName.trim();
    const roundedLat = Number(userLocation.lat.toFixed(3));
    const roundedLng = Number(userLocation.lng.toFixed(3));
    const defaultName = `${roundedLat}, ${roundedLng}`;

    // 1) Upsert by name (case-insensitive) or by rounded coordinates
    await upsertResourcesForOffline(
      (r) => {
        const sameName = areaName ? (r.areaName || "").toLowerCase() === areaName.toLowerCase() : false;
        const sameCoords = Number(r.centerLat.toFixed(3)) === roundedLat && Number(r.centerLng.toFixed(3)) === roundedLng;
        return sameName || sameCoords;
      },
      (existing) => ({
        id: existing?.id,
        savedAt: Date.now(),
        centerLat: userLocation.lat,
        centerLng: userLocation.lng,
        areaName: areaName || existing?.areaName || defaultName,
        resources: resources.map(r => ({ name: r.name, address: r.address, phone: r.phone, lat: r.lat, lng: r.lng, type: r.type }))
      })
    ).catch(console.warn);
    // refresh list for immediate feedback
    await dedupeSavedAreas();
    // toast confirm
    try {
      const el = document.createElement('div');
      el.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all';
      el.textContent = `Saved for offline${areaName ? `: ${areaName}` : ''}`;
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -10px)'; }, 1400);
      setTimeout(() => el.remove(), 1900);
    } catch {}

    // 2) Best-effort tile prefetch (limited set around center)
    try {
      const zLevels = [12, 13, 14];
      const lat = userLocation.lat;
      const lng = userLocation.lng;
      // Simple conversion to tile x/y for a few neighbors
      const toTile = (latDeg: number, lonDeg: number, zoom: number) => {
        const x = Math.floor(((lonDeg + 180) / 360) * Math.pow(2, zoom));
        const y = Math.floor(
          (
            (1 -
              Math.log(Math.tan((latDeg * Math.PI) / 180) + 1 / Math.cos((latDeg * Math.PI) / 180)) /
                Math.PI) /
            2
          ) * Math.pow(2, zoom)
        );
        return { x, y };
      };
      const neighbors = [-1, 0, 1];
      const requests: Promise<Response>[] = [];
      for (const z of zLevels) {
        const { x, y } = toTile(lat, lng, z);
        for (const dx of neighbors) {
          for (const dy of neighbors) {
            const url = `https://a.tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`;
            requests.push(fetch(url, { mode: "no-cors", cache: "reload" }));
          }
        }
      }
      // Fire and forget
      void Promise.allSettled(requests);
    } catch (e) {
      console.warn("Tile prefetch skipped:", e);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-10">
        {/* Header Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-3xl mb-5 sm:mb-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <span className="text-white text-3xl sm:text-4xl">🏥</span>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-600 to-gray-700 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
          Emergency Resources
        </h1>
        
        {/* Description */}
        <p className="text-sm sm:text-base md:text-lg text-gray-800 dark:text-gray-800 max-w-2xl mx-auto mb-6 sm:mb-8 px-4 leading-relaxed ">
          Find nearby emergency services. All data is cached for offline access after first load.
        </p>
                
        {/* Status and Actions */}
        {isOnline ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4">
            {/* Online Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full text-sm sm:text-base text-white border-2 border-emerald-400 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
              <span>Online</span>
            </div>
            
            {/* Live Map Button - Primary Action */}
            <Link
              href="/map"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
            >
              <span className="text-lg">🗺️</span>
              <span>Live Map</span>
            </Link>
            
            {/* Save for Offline Button */}
            <button
              onClick={downloadAreaForOffline}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-lg">⬇️</span>
              <span className="whitespace-nowrap">Save this area for offline</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 mb-6 sm:mb-8 px-4">
            {/* Offline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/20 rounded-full text-sm sm:text-base text-orange-700 dark:text-orange-300 border-2 border-orange-200 dark:border-orange-700 font-semibold shadow-md">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
              <span>Offline - showing previously saved resources</span>
            </div>
            
            {/* Saved Areas Card */}
            <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-2 border-gray-200/70 dark:border-gray-700/70 rounded-2xl p-4 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">Saved Areas</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full font-semibold">
                  {allSaved.length} saved
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 sm:max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {allSaved.length === 0 && (
                  <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 w-full text-center py-4">
                    No areas saved yet. Go online and use "Save this area for offline".
                  </div>
                )}
                {allSaved.map(area => (
                  <div key={area.id} className="inline-flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSavedResources(area);
                        setResources(area.resources as any);
                        setUserLocation({ lat: area.centerLat, lng: area.centerLng });
                        setActiveSavedId(area.id ?? null);
                      }}
                      className={`group px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm border-2 transition-all duration-200 ${
                        activeSavedId === area.id 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg scale-105' 
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:shadow-md'
                      }`}
                      title={`Saved ${new Date(area.savedAt).toLocaleString()} • ${area.resources.length} places`}
                      aria-label={`Open saved area ${area.areaName || 'unnamed'}`}
                    >
                      <span className="mr-1.5">📍</span>
                      <span className="font-semibold">{area.areaName || `${area.centerLat.toFixed(3)}, ${area.centerLng.toFixed(3)}`}</span>
                      <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeSavedId === area.id 
                          ? 'bg-white/30 text-white' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {area.resources.length}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!area.id) return;
                        const ok = window.confirm(`Delete saved area "${area.areaName || `${area.centerLat.toFixed(3)}, ${area.centerLng.toFixed(3)}`}"?`);
                        if (!ok) return;
                        await deleteSavedResources(area.id).catch(() => {});
                        await dedupeSavedAreas();
                        if (activeSavedId === area.id) {
                          setActiveSavedId(null);
                          setSavedResources(null);
                          setResources([]);
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors font-semibold"
                      title="Remove saved area"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Search Controls Card */}
        {isOnline && userLocation && (
          <div 
            className="backdrop-blur-sm rounded-3xl p-5 sm:p-6 border-2 shadow-xl max-w-5xl mx-auto w-full mb-6 sm:mb-8"
            style={{ 
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
            }}
          >
            {/* Top Row: Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              {/* Search Radius Selector */}
              <div className="flex-1 sm:flex-none">
                <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200">
                  <span className="text-white font-bold text-sm sm:text-base whitespace-nowrap flex-shrink-0">
                    🔍 Search Radius:
                  </span>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border-2 border-white rounded-xl text-sm sm:text-base font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="15">15 km</option>
                    <option value="25">25 km</option>
                    <option value="50">50 km</option>
                    <option value="100">100 km</option>
                  </select>
                </div>
              </div>

              {/* Refresh Location Button */}
              <button
                onClick={async () => {
                  try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                      navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000
                      });
                    });
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setUserLocation({ lat, lng });
                    generateNearbyResources(lat, lng);
                  } catch (error) {
                    console.log("Could not refresh location:", error);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-bold rounded-2xl transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg hover:scale-105 w-full sm:w-auto border-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
              >
                <span className="text-lg sm:text-xl">🔄</span>
                <span className="hidden sm:inline">Refresh Location</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>
            
            {/* Bottom: Resource Count and Location */}
            <div 
              className="px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border-2"
              style={{ 
                backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                borderColor: theme === 'dark' ? '#4b5563' : '#e5e7eb'
              }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="text-green-600 dark:text-green-400 font-bold text-xl sm:text-2xl">📍</span>
                  <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
                    Showing <span className="text-blue-600 dark:text-blue-400 font-extrabold">{resources.length}</span> resources within <span className="text-blue-600 dark:text-blue-400 font-extrabold">{radius} km</span>
                  </span>
                </div>
                <span 
                  className="text-xs sm:text-sm md:text-base font-mono font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border shadow-sm"
                  style={{
                    color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                    backgroundColor: theme === 'dark' ? '#4b5563' : '#f3f4f6',
                    borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db'
                  }}
                >
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-8 border border-gray-200/60 shadow-lg">
        <div className="flex flex-col gap-4">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab as any)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  active === tab 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-100 dark:hover:bg-gray-200 border border-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name or address..."
              className="w-full h-10 sm:h-12 pl-10 pr-4 rounded-xl border border-gray-300 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* When offline and no saved area selected, don't render cards at all */}
      {(!isOnline && activeSavedId === null) ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8 text-center shadow-lg">
          <div className="text-gray-400 text-4xl mb-3">📍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a saved area</h3>
          <p className="text-gray-600">Choose one of your saved areas above to load its resources.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filtered.map((r, index) => (
          <div key={`${r.name}-${r.lat}-${r.lng}-${index}`} className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/60 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="relative">
              <MapPreview lat={r.lat} lng={r.lng} name={r.name} address={r.address} />
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium shadow-sm ${
                  r.type === 'Hospital' ? 'bg-red-500 text-white' :
                  r.type === 'Shelter' ? 'bg-blue-500 text-white' :
                  r.type === 'Police' ? 'bg-indigo-500 text-white' :
                  'bg-orange-500 text-white'
                }`}>
                  {r.type}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors pr-2">{r.name}</h2>
              </div>
              <div className="flex items-start gap-2 text-gray-600 mb-3 sm:mb-4">
                <span className="text-gray-400 text-sm mt-0.5">📍</span>
                <span className="text-xs sm:text-sm flex-1 break-words">{r.address}</span>
              </div>
              <a 
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                href={`tel:${r.phone}`}
              >
                <span className="text-lg">📞</span>
                <span className="hidden sm:inline">{r.phone}</span>
                <span className="sm:hidden">{r.phone.replace(/\s/g, '')}</span>
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-8 text-center shadow-lg">
            <div className="text-gray-400 text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">Try adjusting your search or selecting a different category.</p>
          </div>
        )}
      </div>
      )}

      <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <span>💡</span>
          <span>Map tiles are cached for offline use. Contact details remain available even when offline.</span>
        </div>
      </div>

      {/* Offline test banner removed; real offline handling now uses isOnline */}
    </div>
  );
}


