"use client";
import { useMemo, useState, useEffect } from "react";
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

  function generateNearbyResources(userLat: number, userLng: number) {
    // Generate resources around user's location
    const nearbyResources: Resource[] = [
      {
        name: "City General Hospital",
        address: `${Math.round((userLat + 0.01) * 1000) / 1000}, ${Math.round((userLng + 0.01) * 1000) / 1000}`,
        phone: "+216 71 123 456",
        lat: userLat + 0.01,
        lng: userLng + 0.01,
        type: "Hospital"
      },
      {
        name: "Emergency Shelter",
        address: `${Math.round((userLat - 0.005) * 1000) / 1000}, ${Math.round((userLng + 0.008) * 1000) / 1000}`,
        phone: "+216 71 234 567",
        lat: userLat - 0.005,
        lng: userLng + 0.008,
        type: "Shelter"
      },
      {
        name: "Police Station",
        address: `${Math.round((userLat + 0.008) * 1000) / 1000}, ${Math.round((userLng - 0.012) * 1000) / 1000}`,
        phone: "+216 71 345 678",
        lat: userLat + 0.008,
        lng: userLng - 0.012,
        type: "Police"
      },
      {
        name: "Fire Department",
        address: `${Math.round((userLat - 0.003) * 1000) / 1000}, ${Math.round((userLng - 0.006) * 1000) / 1000}`,
        phone: "+216 71 456 789",
        lat: userLat - 0.003,
        lng: userLng - 0.006,
        type: "Fire"
      }
    ];
    
    setResources(nearbyResources);
  }

  const filtered = useMemo(() => {
    if (!isOnline && activeSavedId === null) {
      return [] as Resource[];
    }
    const source = isOnline ? resources : ((savedResources?.resources as any[]) ?? []);
    const byType = active === "All" ? source : source.filter(r => r.type === active);
    const q = query.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(r => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q));
  }, [active, query, resources, isOnline, savedResources, activeSavedId]);

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
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-white text-2xl">🏥</span>
        </div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                  Emergency Resources
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
                  Find nearby emergency services. All data is cached for offline access after first load.
                </p>
                
                {isOnline ? (
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-sm text-emerald-700 border border-emerald-200">
                      <span>🟢</span>
                      Online
                    </div>
                    <button
                      onClick={downloadAreaForOffline}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <span>⬇️</span>
                      Save this area for offline
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full text-sm text-orange-700 border border-orange-200">
                      <span>🔶</span>
                      Offline - showing previously saved resources
                    </div>
                    <div className="w-full max-w-2xl bg-white/90 border border-gray-200/70 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-700">Saved areas</div>
                        <div className="text-xs text-gray-500">{allSaved.length} saved</div>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-28 overflow-auto pr-1">
                        {allSaved.length === 0 && (
                          <div className="text-sm text-gray-500">No areas saved yet. Go online and use “Save this area for offline”.</div>
                        )}
                        {allSaved.map(area => (
                          <div key={area.id} className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSavedResources(area);
                                setResources(area.resources as any);
                                setUserLocation({ lat: area.centerLat, lng: area.centerLng });
                                setActiveSavedId(area.id ?? null);
                              }}
                              className={`group px-3 py-1.5 rounded-full text-sm border transition-colors ${activeSavedId === area.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'}`}
                              title={`Saved ${new Date(area.savedAt).toLocaleString()} • ${area.resources.length} places`}
                              aria-label={`Open saved area ${area.areaName || 'unnamed'}`}
                            >
                              <span className="mr-1">📍</span>
                              <span className="font-medium">{area.areaName || `${area.centerLat.toFixed(3)}, ${area.centerLng.toFixed(3)}`}</span>
                              <span className={`ml-2 inline-block px-2 py-[2px] rounded-full text-[10px] ${activeSavedId === area.id ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>{area.resources.length}</span>
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
                              className="px-2 py-1 text-xs rounded-full bg-red-50 hover:bg-red-100 text-red-600"
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
                {isOnline && userLocation && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full text-sm text-green-700 border border-green-200">
                      <span className="text-green-600">📍</span>
                      Showing resources near your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </div>
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
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <span>🔄</span>
                      Refresh Location
                    </button>
                  </div>
                )}
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200/60 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active === tab 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name or address..."
              className="h-10 pl-10 pr-4 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm min-w-64"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((r) => (
          <div key={r.name} className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="relative">
              <MapPreview lat={r.lat} lng={r.lng} name={r.name} address={r.address} />
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  r.type === 'Hospital' ? 'bg-red-100 text-red-700' :
                  r.type === 'Shelter' ? 'bg-blue-100 text-blue-700' :
                  r.type === 'Police' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {r.type}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{r.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <span className="text-gray-400">📍</span>
                <span className="text-sm">{r.address}</span>
              </div>
              <a 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                href={`tel:${r.phone}`}
              >
                <span>📞</span>
                {r.phone}
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


