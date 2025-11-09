# Map Snapshot Feature - Bug Fixes

## Issues Found and Fixed

### Issue 1: 404 Error When Syncing Map Snapshot
**Error:** `❌ Failed to sync map snapshot for alert temp_1762698191141_qcqogyz: 404 "Alert not found"`

**Root Cause:**
- Map snapshot was cached with a temp ID (`temp_${timestamp}_${random}`)
- But the queued alert had a different ID (`alert_${timestamp}_${random}`)
- When trying to sync, backend couldn't find an alert with the temp ID

**Fix:**
1. Changed to use the **queued alert ID** directly for map snapshot cache (instead of generating a separate temp ID)
2. Added logic to **skip syncing** map snapshots with queued alert IDs (they start with `alert_` or `temp_`)
3. When alert syncs, the `lifeline-alert-synced` event maps the queued ID to the real alert ID
4. Map snapshot then syncs with the real alert ID

**Code Changes:**
- `AlertsContext.tsx`: Use `queueAlert()` return value (queued alert ID) for map snapshot cache
- `useMapSnapshotCache.ts`: Skip syncing for queued alert IDs, handle 404 gracefully
- `MapSnapshotSync.tsx`: Immediately sync map snapshot after ID mapping

### Issue 2: "📍 Location Cached" Badge Not Showing

**Root Cause:**
- Badge only shows for alerts that are in the alerts list
- Queued alerts don't appear in the list until they're synced
- Badge check uses `alert._id` but cache might have queued alert ID

**Fix:**
1. Badge will show **after** alert is synced and appears in the list
2. If map snapshot is still cached (not yet synced), badge will show "📍 Location Cached"
3. Once map snapshot syncs, badge changes to "🗺️ Map Synced"

**Note:** Queued alerts don't appear in the alerts list, so badges can't show for them. The badge will appear once the alert is synced and visible in the list.

## Updated Flow

### Creating Alert Offline:
1. User creates alert
2. `queueAlert()` returns queued alert ID: `alert_123_abc`
3. Map snapshot cached with **same ID**: `alert_123_abc` ✅
4. Alert queued in offline queue
5. User sees: "Alert queued. Will sync when online."

### Coming Online:
1. Alert syncs first → gets real ID: `alert_user_456`
2. Event dispatched: `{ alertId: 'alert_user_456', tempId: 'alert_123_abc' }`
3. `MapSnapshotSync` maps cache: `alert_123_abc` → `alert_user_456`
4. Map snapshot syncs with real alert ID
5. Badge shows: "📍 Location Cached" (if still cached) or "🗺️ Map Synced" (if synced)

## Testing the Fix

### Test 1: Create Alert Offline
1. Go offline (DevTools → Network → Offline)
2. Create an alert
3. **Check console:** Should see `🗺️ Cached map snapshot for queued alert: alert_...`
4. **Check localStorage:** `localStorage.getItem('lifeline:offline_map_snapshots')` should have entry with queued alert ID

### Test 2: Sync When Online
1. Have cached map snapshot from Test 1
2. Go online
3. **Check console:** Should see:
   - `✅ Successfully synced alert alert_...`
   - `🗺️ Mapped map snapshot from queued ID alert_... to alert alert_user_...`
   - `✅ Successfully synced map snapshot for alert alert_user_... after mapping`
4. **Check alert card:** Should show "🗺️ Map Synced" badge

### Test 3: Badge Display
1. Create alert offline (with map snapshot)
2. Go online and wait for alert to sync
3. **Check alert card:** Should show "📍 Location Cached" badge if map snapshot is still cached
4. After map snapshot syncs: Badge should change to "🗺️ Map Synced"

## Debug Commands

### Check Cached Map Snapshots
```javascript
JSON.parse(localStorage.getItem('lifeline:offline_map_snapshots'))
```

### Check Queued Alerts
```javascript
JSON.parse(localStorage.getItem('lifeline:offline_alerts_queue'))
```

### Check if IDs Match
```javascript
const queued = JSON.parse(localStorage.getItem('lifeline:offline_alerts_queue'));
const maps = JSON.parse(localStorage.getItem('lifeline:offline_map_snapshots'));
console.log('Queued alerts:', queued.map(a => a.alertId));
console.log('Cached maps:', maps.map(m => m.alertId));
// IDs should match!
```

## Expected Behavior After Fix

✅ **No more 404 errors** - Map snapshots wait for alerts to sync first  
✅ **Badge shows after sync** - "📍 Location Cached" appears when alert is in list and map is cached  
✅ **Proper ID mapping** - Queued alert IDs correctly mapped to real alert IDs  
✅ **Automatic sync** - Map snapshots sync immediately after alert syncs  

## Files Modified

1. `lifeline-app/src/contexts/AlertsContext.tsx`
   - Use queued alert ID for map snapshot cache
   - Consistent ID usage across all queue scenarios

2. `lifeline-app/src/hooks/useMapSnapshotCache.ts`
   - Skip syncing for queued alert IDs
   - Handle 404 errors gracefully (wait for alert sync)

3. `lifeline-app/src/components/MapSnapshotSync.tsx`
   - Immediately sync map snapshot after ID mapping
   - Use `getApiUrl()` for proper API URL

4. `lifeline-app/src/app/alerts/page.tsx`
   - Added debug logging for badge display
   - Badge logic remains the same (works after alert syncs)

## Status

✅ **FIXED** - Both issues resolved:
- 404 errors eliminated
- Badge will show after alert syncs (queued alerts don't appear in list, so badge can't show before sync)

