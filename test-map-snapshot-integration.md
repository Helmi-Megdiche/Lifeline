# Map Snapshot Feature - Integration Test Guide

## Quick Test Checklist

### ✅ Prerequisites
- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000`
- [ ] User logged in (for authenticated endpoints)
- [ ] Google Maps API key configured (optional, will use coordinates only if missing)

### 🧪 Manual Test Steps

#### Test 1: Create Alert with Map Snapshot (Online)
1. Open browser DevTools → Network tab
2. Ensure you're **online**
3. Create a new alert
4. **Expected:**
   - Alert created successfully
   - Map snapshot captured (check Network tab for Google Static Maps API call)
   - "🗺️ Map Synced" badge appears on alert card
   - Check backend: Alert document should have `mapSnapshot` field

#### Test 2: Create Alert with Map Snapshot (Offline)
1. Open browser DevTools → Network tab → Check "Offline"
2. Create a new alert
3. **Expected:**
   - Alert queued (shows "📤 Queued" badge)
   - "📍 Location Cached" badge appears
   - Check `localStorage.getItem('lifeline:offline_map_snapshots')` in Console
   - Should see cached map snapshot with temp alert ID

#### Test 3: Sync Map Snapshot When Coming Online
1. Have cached map snapshots from Test 2
2. Uncheck "Offline" in DevTools
3. **Expected:**
   - Toast notification: "Syncing X map snapshot(s)..."
   - After sync: "✅ Synced X map snapshot(s)"
   - "📍 Location Cached" badge changes to "🗺️ Map Synced"
   - Check backend: Alert document should have `mapSnapshot` field

#### Test 4: Location Permission Denied
1. Deny location permission when prompted
2. Create an alert
3. **Expected:**
   - Alert created with `locationUnavailable: true`
   - No map image, but coordinates stored if available

#### Test 5: API Key Not Configured
1. Remove `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env.local`
2. Restart frontend
3. Create an alert
4. **Expected:**
   - Alert created successfully
   - Coordinates stored, but no map image
   - Console warning: "⚠️ Google Maps API key not configured"

#### Test 6: Large Image Size (>500KB)
1. Mock a large base64 image in code
2. Try to sync map snapshot
3. **Expected:**
   - Backend returns 400 error: "Map image exceeds 500KB limit"
   - Coordinates stored, but no map image

#### Test 7: Multiple Alerts Offline
1. Go offline
2. Create 3-4 alerts
3. **Expected:**
   - All alerts queued
   - All map snapshots cached
   - Check localStorage: Should see all cached snapshots

#### Test 8: App Reload with Cached Snapshots
1. Create alerts offline (from Test 7)
2. Close and reopen browser/app
3. **Expected:**
   - Cached snapshots persist in localStorage
   - If online: Auto-syncs after 1 second
   - If offline: Badges remain, syncs when online

## Browser Console Commands

### Check Cached Map Snapshots
```javascript
JSON.parse(localStorage.getItem('lifeline:offline_map_snapshots'))
```

### Clear Map Snapshot Cache
```javascript
localStorage.removeItem('lifeline:offline_map_snapshots')
```

### Check Alert Queue
```javascript
JSON.parse(localStorage.getItem('lifeline:offline_alerts_queue'))
```

### Simulate Offline
```javascript
// In DevTools → Network tab → Check "Offline"
// Or:
Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
window.dispatchEvent(new Event('offline'));
```

### Simulate Online
```javascript
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
window.dispatchEvent(new Event('online'));
```

## Backend API Testing

### Test Map Snapshot Endpoint
```bash
# Replace TOKEN with actual JWT token
# Replace ALERT_ID with actual alert ID

curl -X POST http://localhost:3001/alerts/ALERT_ID/map \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "lat": 36.8115712,
    "lng": 10.174464,
    "mapImage": "base64_test_string",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "locationUnavailable": false
  }'
```

### Check Alert with Map Snapshot
```bash
curl http://localhost:3001/alerts/ALERT_ID \
  -H "Authorization: Bearer TOKEN"
```

## Expected Results

### ✅ Success Indicators
- Map snapshots cached in localStorage when offline
- Auto-sync when connection restored
- UI badges show correct status
- Backend stores map snapshot data
- Temp IDs mapped to real alert IDs

### ❌ Failure Indicators
- Map snapshots not cached when offline
- Sync fails without retry
- UI badges don't update
- Backend returns errors
- Data loss on app reload

## Troubleshooting

### Map Snapshots Not Caching
- Check browser console for errors
- Verify localStorage is available
- Check if quota exceeded

### Sync Not Working
- Verify backend is running
- Check authentication token
- Verify network connection
- Check browser console for errors

### Badges Not Showing
- Verify `useMapSnapshotCache` hook is working
- Check if `getCachedSnapshot` returns data
- Verify alert has `mapSnapshot` field

## Performance Notes

- Map snapshot capture is **non-blocking** (async)
- Sync happens in background
- localStorage size: ~25KB per snapshot (with image)
- Max cache size: 50 snapshots (configurable)

