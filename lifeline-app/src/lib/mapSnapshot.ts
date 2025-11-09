/**
 * Map Snapshot Utility
 * Captures static map images using Google Static Maps API
 * Handles offline caching and sync
 */

export interface MapSnapshotData {
  lat: number;
  lng: number;
  mapImage: string; // base64 PNG
  timestamp: string;
  locationUnavailable?: boolean;
}

const GOOGLE_STATIC_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAP_SIZE = '640x400'; // Width x Height
const MAP_ZOOM = 15;

/**
 * Generate Google Static Maps API URL
 */
function getStaticMapUrl(lat: number, lng: number): string {
  if (!GOOGLE_STATIC_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not configured. Map snapshots will not work.');
    return '';
  }

  const marker = `${lat},${lng}`;
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(MAP_ZOOM),
    size: MAP_SIZE,
    markers: `color:red|label:📍|${marker}`,
    key: GOOGLE_STATIC_MAPS_API_KEY,
    maptype: 'roadmap',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Convert image URL to base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch map image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (data:image/png;base64,)
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Capture map snapshot for given coordinates
 * @param lat Latitude
 * @param lng Longitude
 * @returns Map snapshot data or null if failed
 */
export async function captureMapSnapshot(
  lat: number,
  lng: number
): Promise<MapSnapshotData | null> {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('⚠️ Invalid coordinates for map snapshot:', { lat, lng });
    return {
      lat,
      lng,
      mapImage: '',
      timestamp: new Date().toISOString(),
      locationUnavailable: true,
    };
  }

  // Check if API key is configured
  if (!GOOGLE_STATIC_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not configured. Storing coordinates only.');
    return {
      lat,
      lng,
      mapImage: '',
      timestamp: new Date().toISOString(),
      locationUnavailable: false,
    };
  }

  try {
    // Generate static map URL
    const mapUrl = getStaticMapUrl(lat, lng);
    
    if (!mapUrl) {
      return {
        lat,
        lng,
        mapImage: '',
        timestamp: new Date().toISOString(),
        locationUnavailable: false,
      };
    }

    // Fetch and convert to base64
    const mapImage = await imageUrlToBase64(mapUrl);

    // Check size (limit to 500KB)
    const sizeInBytes = (mapImage.length * 3) / 4; // Approximate base64 size
    if (sizeInBytes > 500 * 1024) {
      console.warn('⚠️ Map image exceeds 500KB limit. Storing coordinates only.');
      return {
        lat,
        lng,
        mapImage: '',
        timestamp: new Date().toISOString(),
        locationUnavailable: false,
      };
    }

    return {
      lat,
      lng,
      mapImage,
      timestamp: new Date().toISOString(),
      locationUnavailable: false,
    };
  } catch (error) {
    console.error('❌ Failed to capture map snapshot:', error);
    // Return coordinates only if image capture fails
    return {
      lat,
      lng,
      mapImage: '',
      timestamp: new Date().toISOString(),
      locationUnavailable: false,
    };
  }
}

/**
 * Get user's current location
 * @returns Promise with coordinates or null if denied/unavailable
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('⚠️ Location permission denied or unavailable:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

