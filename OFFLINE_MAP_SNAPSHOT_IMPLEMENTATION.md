# Offline Map Snapshot Implementation - Summary

## Overview

Successfully implemented an **Offline Map Snapshot** feature for the LifeLine app that captures static map images when alerts are created, caches them locally when offline, and automatically syncs them to the backend when online.

## Files Created/Modified

### Frontend (Next.js)

#### New Files:
1. **`lifeline-app/src/lib/mapSnapshot.ts`**
   - Map snapshot utility using Google Static Maps API
   - Functions: `captureMapSnapshot()`, `getCurrentLocation()`
   - Handles base64 image conversion and size validation (500KB limit)

2. **`lifeline-app/src/hooks/useMapSnapshotCache.ts`**
   - Hook for managing offline map snapshot cache
   - localStorage-based storage (`lifeline:offline_map_snapshots`)
   - Auto-sync on reconnect
   - Retry logic (max 3 attempts)

3. **`lifeline-app/src/components/MapSnapshotSync.tsx`**
   - Component for automatic background sync
   - Maps temp alert IDs to real alert IDs when alerts are synced
   - Shows toast notifications during sync

#### Modified Files:
1. **`lifeline-app/src/contexts/AlertsContext.tsx`**
   - Integrated map snapshot capture into `createAlert()`
   - Captures map snapshot asynchronously (non-blocking)
   - Caches map snapshot when offline or on failure
   - Syncs map snapshot immediately when online

2. **`lifeline-app/src/app/alerts/page.tsx`**
   - Added UI indicators for map caching status:
     - "📍 Location Cached" (blue badge) - when map is cached offline
     - "🗺️ Map Synced" (green badge) - when map is synced to backend
   - Updated Alert interface to include `mapSnapshot` field

3. **`lifeline-app/src/app/layout.tsx`**
   - Added `MapSnapshotSync` component for global auto-syncing

4. **`lifeline-app/src/hooks/useOfflineQueue.ts`**
   - Dispatches `lifeline-alert-synced` event when alerts are synced
   - Allows map snapshot cache to map temp IDs to real alert IDs

### Backend (NestJS)

#### New Files:
1. **`lifeline-backend/src/dto/map-snapshot.dto.ts`**
   - DTO for map snapshot data validation
   - Validates lat, lng, mapImage (base64, max 500KB), timestamp, locationUnavailable

#### Modified Files:
1. **`lifeline-backend/src/schemas/alert.schema.ts`**
   - Added `mapSnapshot` field to Alert schema:
     ```typescript
     mapSnapshot?: {
       lat: number;
       lng: number;
       mapImage?: string; // base64 PNG
       locationSyncedAt?: Date;
       locationUnavailable?: boolean;
     }
     ```

2. **`lifeline-backend/src/alerts/alerts.controller.ts`**
   - Added `POST /alerts/:id/map` endpoint
   - Validates base64 image size (500KB limit)
   - Requires JWT authentication
   - Rate limited: 20 requests per minute

3. **`lifeline-backend/src/alerts/alerts.service.ts`**
   - Added `addMapSnapshot()` method
   - Verifies user owns the alert
   - Updates alert with map snapshot data

4. **`lifeline-backend/src/dto/index.ts`**
   - Exported `MapSnapshotDto`

## Key Features

### 1. Map Snapshot Capture
- Uses **Google Static Maps API** (free tier)
- Generates 640x400 PNG images
- Centers map on user's coordinates with red marker
- Converts to base64 for storage
- Handles API key configuration via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### 2. Offline Caching
- Stores map snapshots in `localStorage` when offline
- Key: `lifeline:offline_map_snapshots`
- Handles `QuotaExceededError` gracefully (keeps 10 most recent)
- Shows "📍 Location Cached" badge on alert cards

### 3. Auto-Sync
- Automatically syncs cached snapshots when connection restored
- Maps temp alert IDs to real alert IDs when alerts are synced
- Retry logic: max 3 attempts per snapshot
- Shows toast notifications during sync

### 4. Edge Cases Handled
- ✅ Location permission denied → stores `locationUnavailable: true`
- ✅ Map image capture fails → stores coordinates only
- ✅ Alert sent but map syncs later → backend merges map data into existing alert
- ✅ API key not configured → stores coordinates only
- ✅ Image exceeds 500KB → stores coordinates only
- ✅ localStorage full → keeps 10 most recent snapshots

## Data Flow

### Creating Alert While Offline:
1. User creates alert
2. `captureMapSnapshot()` is called asynchronously
3. Map snapshot captured (or coordinates only if capture fails)
4. Alert queued in offline queue
5. Map snapshot cached with temp alert ID
6. UI shows "📍 Location Cached" badge

### Coming Back Online:
1. `MapSnapshotSync` component detects online status
2. `lifeline-alert-synced` event fired when alert is synced
3. Temp ID mapped to real alert ID
4. Map snapshot synced via `POST /alerts/:id/map`
5. Snapshot removed from cache on success
6. UI shows "🗺️ Map Synced" badge

### Creating Alert While Online:
1. User creates alert
2. Alert sent immediately to backend
3. Map snapshot captured asynchronously
4. Map snapshot synced immediately if available
5. If sync fails, cached for later retry

## API Endpoint

### `POST /alerts/:id/map`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "lat": 36.8115712,
  "lng": 10.174464,
  "mapImage": "base64_encoded_png_string",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "locationUnavailable": false
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "_id": "alert_id",
    "mapSnapshot": {
      "lat": 36.8115712,
      "lng": 10.174464,
      "mapImage": "base64_encoded_png_string",
      "locationSyncedAt": "2024-01-15T10:30:00.000Z",
      "locationUnavailable": false
    },
    ...
  }
}
```

**Validation:**
- `mapImage` max size: 500KB (base64)
- User must own the alert
- Rate limit: 20 requests/minute

## Environment Variables

Add to `.env.local` (frontend):
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Note:** Google Static Maps API free tier allows:
- 28,000 requests/month
- No credit card required
- Get API key from [Google Cloud Console](https://console.cloud.google.com/)

## Testing

### Test Scenarios:

1. **Create Alert Offline:**
   - Disable network in DevTools
   - Create alert
   - Verify "📍 Location Cached" badge appears
   - Check `localStorage.getItem('lifeline:offline_map_snapshots')`

2. **Sync When Online:**
   - Have cached map snapshots
   - Re-enable network
   - Verify toast notification appears
   - Verify "🗺️ Map Synced" badge appears
   - Check backend database for `mapSnapshot` field

3. **Location Permission Denied:**
   - Deny location permission
   - Create alert
   - Verify `locationUnavailable: true` is stored

4. **API Key Not Configured:**
   - Remove `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Create alert
   - Verify coordinates are stored (no image)

5. **Image Size Exceeds Limit:**
   - Mock large image (>500KB)
   - Verify coordinates only are stored

## Limitations & Future Improvements

### Current Limitations:
1. **API Key Required:** Google Static Maps API key must be configured
2. **Image Size:** Limited to 500KB (base64)
3. **Sequential Sync:** Map snapshots sync one at a time
4. **No Compression:** Images stored as-is (could compress to reduce size)

### Potential Improvements:
1. **Image Compression:** Compress PNG images before storage
2. **Batch Sync:** Sync multiple map snapshots in parallel
3. **Alternative APIs:** Support OpenStreetMap or other free map services
4. **Caching Strategy:** Implement LRU cache for better storage management
5. **Progressive Enhancement:** Show map image in alert detail view
6. **Offline Map Display:** Display cached map images even when offline

## Integration with Existing Features

- ✅ **Offline Alerts Queue:** Map snapshots sync alongside queued alerts
- ✅ **Alert Creation:** Map capture is non-blocking and doesn't delay alert creation
- ✅ **UI Indicators:** Clear visual feedback for map caching status
- ✅ **Error Handling:** Graceful degradation when map capture fails
- ✅ **REST API Only:** No PouchDB dependency, uses standard HTTP requests

## Summary

The Offline Map Snapshot feature is **fully implemented and ready for testing**. It provides:

- ✅ Static map image capture using Google Static Maps API
- ✅ Offline caching in localStorage
- ✅ Automatic sync when connection restored
- ✅ UI indicators for caching status
- ✅ Backend endpoint for storing map data
- ✅ Comprehensive error handling
- ✅ Integration with existing offline alert queue

**Status:** ✅ Complete and ready for testing

