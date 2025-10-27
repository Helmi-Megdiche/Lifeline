"use client";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { setupLeafletDefaultIcon } from "@/lib/leafletIcons";

// Use any to accommodate dynamic import typing differences across versions
const Map = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false }) as any;
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type Props = { 
  lat: number; 
  lng: number; 
  name?: string;
  address?: string;
};

export default function MapPreview({ lat, lng, name, address }: Props) {
  const position: [number, number] = [lat, lng];
  const [tileError, setTileError] = useState<boolean>(false);
  const [mapId] = useState(() => `map-${lat}-${lng}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    setupLeafletDefaultIcon().catch(console.warn);
  }, []);

  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-md" id={mapId}>
      <Map 
        key={mapId}
        center={position} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }} 
        scrollWheelZoom={true} 
        attributionControl={false} 
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTileError(true) as any }}
        />
        <Marker position={position}>
          {(name || address) && (
            <Popup>
              <div className="text-center">
                {name && <div className="font-semibold">{name}</div>}
                {address && <div className="text-sm text-gray-600">{address}</div>}
              </div>
            </Popup>
          )}
        </Marker>
      </Map>
      
      {/* Click overlay to open in Google Maps */}
      <button
        onClick={openInMaps}
        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-md p-2 shadow-md transition-colors z-10"
        title="Open in Google Maps"
      >
        <span className="text-sm">🗺️</span>
      </button>

      {tileError && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-700 bg-white/70">
          <div className="text-center">
            <div>Map tiles unavailable offline</div>
            <button 
              onClick={openInMaps}
              className="mt-2 text-blue-600 underline text-xs"
            >
              Open in Google Maps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


