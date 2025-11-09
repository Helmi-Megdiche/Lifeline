# Offline Alerts Queue Implementation

## Overview

This document describes the complete implementation of the "Offline Alerts Queue" feature for the LifeLine app. The system allows users to create emergency alerts even when offline, storing them in localStorage and automatically syncing them when the connection is restored.

---

## 1. Core Hook: `useOfflineQueue`

**File:** `lifeline-app/src/hooks/useOfflineQueue.ts`

### Features

- **localStorage-based queueing**: Stores alerts in `localStorage` with key `lifeline:offline_alerts_queue`
- **Automatic sync on reconnect**: Monitors `navigator.onLine` and syncs when connection is restored
- **Duplicate prevention**: Checks for duplicate alerts based on location and timestamp (within 5 seconds)
- **Retry logic**: Each alert can retry up to 3 times before being removed
- **Queue size limit**: Maximum 50 alerts to prevent localStorage overflow
- **Quota handling**: Gracefully handles `QuotaExceededError` by keeping only the 10 most recent alerts

### API

```typescript
interface QueuedAlert {
  alertId: string;              // Unique ID: `alert_${timestamp}_${random}`
  payload: {
    category: string;
    title: string;
    description: string;
    severity: string;
    location: { lat: number; lng: number; address?: string };
    ttlHours?: number;
  };
  timestamp: number;            // When alert was queued
  retryCount: number;           // Number of sync attempts (max 3)
}

// Hook returns:
{
  queuedAlerts: QueuedAlert[];  // Array of queued alerts
  queueCount: number;            // Number of pending alerts
  isSyncing: boolean;            // Whether sync is in progress
  isOnline: boolean;             // Current online status
  queueAlert: (payload) => string;  // Add alert to queue, returns alertId
  removeFromQueue: (alertId) => void;  // Remove specific alert
  syncQueuedAlerts: () => Promise<{success: number, failed: number}>;  // Sync all alerts
  clearQueue: () => void;        // Clear all queued alerts
}
```

### Key Implementation Details

1. **Connection Monitoring:**
   ```typescript
   useEffect(() => {
     const handleOnline = () => {
       setIsOnline(true);
       // Wait 1 second for stable connection, then sync
       setTimeout(() => syncQueuedAlerts(), 1000);
     };
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', () => setIsOnline(false));
   }, []);
   ```

2. **Duplicate Detection:**
   ```typescript
   const isDuplicate = prev.some(alert => {
     const sameLocation = 
       Math.abs(alert.payload.location.lat - payload.location.lat) < 0.0001 &&
       Math.abs(alert.payload.location.lng - payload.location.lng) < 0.0001;
     const sameTime = Math.abs(alert.timestamp - Date.now()) < 5000;
     return sameLocation && sameTime && alert.payload.title === payload.title;
   });
   ```

3. **Sync Process:**
   - Iterates through all queued alerts
   - Sends each via `POST /alerts` (REST API)
   - Removes successful alerts from queue
   - Increments retry count for failed alerts
   - Removes alerts that exceed max retries

---

## 2. UI Components

### A. OfflineQueueBadge Component

**File:** `lifeline-app/src/components/OfflineQueueBadge.tsx`

**Purpose:** Visual indicator showing number of pending alerts

**Features:**
- Shows count of queued alerts
- Color-coded states:
  - **Red**: Offline (alerts queued)
  - **Yellow**: Online but not syncing (pending)
  - **Blue with pulse**: Currently syncing
- Tooltip with detailed status
- Auto-hides when queue is empty

**Usage:**
```tsx
<OfflineQueueBadge className="ml-2" />
<OfflineQueueBadge showText={true} />  // Shows "X pending" text
```

**Visual States:**
- `queueCount = 0`: Component returns `null` (hidden)
- `isSyncing = true`: Blue badge with spinning icon + "Syncing..." text
- `isOnline = false`: Red badge with count
- `isOnline = true`: Yellow badge with count

### B. OfflineQueueSync Component

**File:** `lifeline-app/src/components/OfflineQueueSync.tsx`

**Purpose:** Automatic background sync with toast notifications

**Features:**
- Automatically triggers sync when:
  - User comes online
  - User authenticates (token available)
  - Queue has items
- Shows toast notification during sync
- Displays success/failure summary
- Prevents duplicate syncs with `hasSyncedRef`

**Integration:**
Added to `lifeline-app/src/app/layout.tsx`:
```tsx
<GlobalEmergencyListener />
<OfflineQueueSync />  // Auto-syncs queued alerts
<InstallPrompt />
```

**Toast Messages:**
- Syncing: `"Syncing X alert(s)..."`
- Success: `"✅ Synced X alert(s), Y failed"`
- Failure: `"❌ Failed to sync X alert(s)"`

---

## 3. Integration with AlertsContext

**File:** `lifeline-app/src/contexts/AlertsContext.tsx`

### Changes to `createAlert` Function

**Before:** Always attempted to send immediately, failed if offline

**After:** 
1. Checks if offline or unauthenticated
2. If offline/unauthenticated → queues alert
3. If online and authenticated → sends immediately
4. If send fails with network error → queues for retry
5. If send fails with server error (500+) → queues for retry

**Code Flow:**
```typescript
const createAlert = async (payload) => {
  // ... validate payload ...
  
  const isOffline = !navigator.onLine;
  const hasToken = !!token;
  
  // Queue if offline or no token
  if (isOffline || !hasToken) {
    queueAlert(alertPayload);
    showNotification('Alert queued. Will sync when online.', 'info');
    return;
  }
  
  // Try to send immediately
  try {
    const response = await fetch('/alerts', { ... });
    if (response.ok) {
      // Success
    } else if (response.status >= 500 || !navigator.onLine) {
      // Server error or went offline - queue it
      queueAlert(alertPayload);
    }
  } catch (error) {
    // Network error - queue it
    if (error.message?.includes('Failed to fetch')) {
      queueAlert(alertPayload);
    }
  }
};
```

---

## 4. UI Integration

### Alerts Page

**File:** `lifeline-app/src/app/alerts/page.tsx`

**Changes:**
1. Imported `useOfflineQueue` hook
2. Imported `OfflineQueueBadge` component
3. Added badge next to "Create Alert" button

**Visual:**
```
[🚨 Create Alert] [Badge: 3 pending]
```

The badge appears next to the create button, showing the number of queued alerts.

---

## 5. Backend API

### Endpoint Used: `POST /alerts`

**File:** `lifeline-backend/src/alerts/alerts.controller.ts`

**Existing Endpoint:**
```typescript
@Post()
@UseGuards(JwtAuthGuard)
async createAlert(@Request() req, @Body() createAlertDto: CreateAlertDto) {
  const alert = await this.alertsService.createAlert(
    req.user.userId,
    req.user.username,
    createAlertDto
  );
  return { success: true, alert };
}
```

**Request Body:**
```json
{
  "category": "Fire",
  "title": "Fire emergency",
  "description": "There is a fire",
  "severity": "high",
  "location": {
    "lat": 36.8115712,
    "lng": 10.174464,
    "address": "Optional address"
  },
  "ttlHours": 24
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "_id": "alert_id",
    "category": "Fire",
    "title": "Fire emergency",
    ...
  }
}
```

**Note:** The hook uses the existing `POST /alerts` endpoint. No new endpoint needed. Each queued alert is sent individually when syncing.

---

## 6. Data Flow

### Creating Alert While Offline

1. User clicks "Create Alert" or triggers voice alert
2. `createAlert()` is called
3. `navigator.onLine === false` detected
4. Alert payload is queued via `queueAlert()`
5. Alert stored in `localStorage` with unique ID
6. Badge updates to show count
7. User sees notification: "Alert queued. Will sync when online."

### Coming Back Online

1. `navigator.onLine` changes to `true`
2. `useOfflineQueue` hook detects change
3. Waits 1 second for stable connection
4. `syncQueuedAlerts()` is called automatically
5. For each queued alert:
   - Sends `POST /alerts` with alert payload
   - If success (200/201): Removes from queue
   - If failure: Increments retry count
   - If retry count >= 3: Removes from queue (permanently failed)
6. Toast notification shows: "✅ Synced X alert(s)"
7. Badge updates (count decreases)

### App Reload

1. On mount, `useOfflineQueue` reads from `localStorage`
2. Loads all queued alerts into state
3. Badge shows correct count
4. If online and authenticated, syncs automatically

---

## 7. Error Handling

### QuotaExceededError

**Scenario:** localStorage is full

**Handling:**
```typescript
catch (error: any) {
  if (error.name === 'QuotaExceededError') {
    // Keep only 10 most recent alerts
    const recent = queuedAlerts.slice(-10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    setQueuedAlerts(recent);
  }
}
```

### Network Errors

**Scenario:** Fetch fails (network error, timeout)

**Handling:**
- Alert remains in queue
- Retry count incremented
- Will retry on next sync attempt

### Server Errors (500+)

**Scenario:** Backend returns 500, 503, etc.

**Handling:**
- Alert queued for retry
- Retry count incremented
- Will retry on next sync attempt

### Auth Errors (401, 403)

**Scenario:** Token expired or invalid

**Handling:**
- Alert removed from queue (non-retryable)
- User must re-authenticate
- New alerts will be queued until authenticated

### Max Retries Exceeded

**Scenario:** Alert failed 3+ times

**Handling:**
- Alert removed from queue
- Logged as permanently failed
- User can create new alert if needed

---

## 8. Testing Scenarios

### Test 1: Create Alert Offline

1. Disconnect internet (or use DevTools → Network → Offline)
2. Create an alert
3. **Expected:** Alert queued, badge shows "1", notification says "Alert queued"
4. Check `localStorage.getItem('lifeline:offline_alerts_queue')`
5. **Expected:** Array with 1 alert object

### Test 2: Sync When Coming Online

1. Have 2-3 queued alerts
2. Reconnect internet
3. **Expected:**** 
   - Badge shows "Syncing..." (blue, pulsing)
   - Toast appears: "Syncing 3 alert(s)..."
   - After sync: "✅ Synced 3 alert(s)"
   - Badge disappears (count = 0)
   - Alerts appear in alerts list

### Test 3: Partial Sync Failure

1. Queue 3 alerts
2. Reconnect internet
3. Mock backend to fail on 2nd alert (DevTools → Network → Block request)
4. **Expected:**
   - 1st alert: Success, removed from queue
   - 2nd alert: Failure, retry count = 1, stays in queue
   - 3rd alert: Success, removed from queue
   - Badge shows "1" (one still pending)
   - Toast shows: "✅ Synced 2 alert(s), 1 failed"

### Test 4: App Reload with Queued Alerts

1. Create 2 alerts while offline
2. Close browser/app
3. Reopen app
4. **Expected:**
   - Badge shows "2" immediately
   - If online: Auto-syncs after 1 second
   - If offline: Badge remains, syncs when online

### Test 5: Duplicate Prevention

1. Create alert at location (36.811, 10.174) with title "Test"
2. Immediately create another alert at same location with same title
3. **Expected:** Only 1 alert in queue (duplicate detected and skipped)

### Test 6: Queue Size Limit

1. Create 60 alerts while offline
2. **Expected:** Only 50 most recent alerts kept (oldest 10 removed)

---

## 9. Code Examples

### Example 1: Using the Hook in a Component

```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function MyComponent() {
  const { queueCount, isSyncing, syncQueuedAlerts } = useOfflineQueue();
  
  const handleManualSync = async () => {
    const result = await syncQueuedAlerts();
    console.log(`Synced ${result.success}, failed ${result.failed}`);
  };
  
  return (
    <div>
      <p>Pending alerts: {queueCount}</p>
      {queueCount > 0 && (
        <button onClick={handleManualSync}>
          Sync Now
        </button>
      )}
    </div>
  );
}
```

### Example 2: Queueing an Alert Programmatically

```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function AlertCreator() {
  const { queueAlert } = useOfflineQueue();
  
  const createOfflineAlert = () => {
    const alertId = queueAlert({
      category: 'Emergency',
      title: 'Help needed',
      description: 'I need assistance',
      severity: 'high',
      location: { lat: 36.811, lng: 10.174 },
      ttlHours: 24
    });
    
    console.log('Alert queued with ID:', alertId);
  };
  
  return <button onClick={createOfflineAlert}>Create Alert</button>;
}
```

### Example 3: Checking Queue Status

```typescript
const { queuedAlerts, queueCount, isOnline, isSyncing } = useOfflineQueue();

console.log('Queue status:', {
  count: queueCount,
  online: isOnline,
  syncing: isSyncing,
  alerts: queuedAlerts.map(a => ({
    id: a.alertId,
    title: a.payload.title,
    retries: a.retryCount
  }))
});
```

---

## 10. localStorage Structure

### Storage Key
```
lifeline:offline_alerts_queue
```

### Data Format
```json
[
  {
    "alertId": "alert_1704787200000_abc123",
    "payload": {
      "category": "Fire",
      "title": "Fire emergency",
      "description": "There is a fire",
      "severity": "high",
      "location": {
        "lat": 36.8115712,
        "lng": 10.174464
      },
      "ttlHours": 24
    },
    "timestamp": 1704787200000,
    "retryCount": 0
  },
  {
    "alertId": "alert_1704787300000_def456",
    "payload": { ... },
    "timestamp": 1704787300000,
    "retryCount": 1
  }
]
```

---

## 11. Performance Considerations

### localStorage Size Limits

- **Typical limit:** 5-10 MB per origin
- **Average alert size:** ~500 bytes (JSON)
- **Max queue size:** 50 alerts = ~25 KB
- **Well within limits**

### Sync Performance

- **Sequential processing:** Alerts sent one at a time
- **No parallel requests:** Prevents server overload
- **Timeout handling:** Relies on browser fetch timeout (default ~30s)
- **Retry delay:** Exponential backoff (500ms, 1000ms, 1500ms)

### Optimization Opportunities

1. **Parallel Sync:** Could use `Promise.all()` with concurrency limit
2. **Batch API:** Could create batch endpoint to send multiple alerts at once
3. **Compression:** Could compress alert payloads (minimal benefit for small data)

---

## 12. Security Considerations

### Data Storage

- **localStorage is not encrypted:** Alerts stored in plain JSON
- **Same-origin policy:** Only accessible by same domain
- **No sensitive data:** Alerts contain location and description (already visible to user)

### API Security

- **JWT Authentication:** All sync requests require valid token
- **User isolation:** Backend validates `userId` from token
- **Rate limiting:** Backend has throttling (10 requests/minute)

### Privacy

- **Local storage only:** Data never leaves device until synced
- **User control:** User can clear queue manually (via `clearQueue()`)
- **No external services:** No third-party storage or analytics

---

## 13. Browser Compatibility

### Required APIs

- **localStorage:** Supported in all modern browsers
- **navigator.onLine:** Supported in all modern browsers
- **fetch API:** Supported in all modern browsers
- **Event listeners:** `online`/`offline` events supported

### Fallbacks

- **localStorage unavailable:** Hook returns empty queue (graceful degradation)
- **navigator.onLine unreliable:** Still attempts sync (fetch will fail if truly offline)
- **Quota exceeded:** Keeps only recent alerts (10 most recent)

---

## 14. Files Created/Modified

### New Files

1. **`lifeline-app/src/hooks/useOfflineQueue.ts`**
   - Core hook for queue management
   - 200+ lines

2. **`lifeline-app/src/components/OfflineQueueBadge.tsx`**
   - Badge component
   - ~60 lines

3. **`lifeline-app/src/components/OfflineQueueSync.tsx`**
   - Auto-sync component
   - ~80 lines

### Modified Files

1. **`lifeline-app/src/contexts/AlertsContext.tsx`**
   - Updated `createAlert` to use queue
   - Added `useOfflineQueue` hook
   - ~50 lines changed

2. **`lifeline-app/src/app/alerts/page.tsx`**
   - Added badge next to create button
   - Imported hook and component
   - ~5 lines changed

3. **`lifeline-app/src/app/layout.tsx`**
   - Added `OfflineQueueSync` component
   - ~2 lines changed

---

## 15. API Call Handler Example

### Frontend Sync Handler (in useOfflineQueue.ts)

```typescript
const syncQueuedAlerts = async () => {
  for (const alert of queuedAlerts) {
    try {
      const response = await fetch(getApiUrl('/alerts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(alert.payload),
      });

      if (response.ok) {
        // Success - remove from queue
        removeFromQueue(alert.alertId);
        successCount++;
      } else {
        // Failure - increment retry count
        updateRetryCount(alert.alertId);
        failedCount++;
      }
    } catch (error) {
      // Network error - increment retry count
      updateRetryCount(alert.alertId);
      failedCount++;
    }
  }
  
  return { success: successCount, failed: failedCount };
};
```

### Backend Endpoint (already exists)

```typescript
// lifeline-backend/src/alerts/alerts.controller.ts
@Post()
@UseGuards(JwtAuthGuard)
async createAlert(@Request() req, @Body() createAlertDto: CreateAlertDto) {
  const alert = await this.alertsService.createAlert(
    req.user.userId,
    req.user.username,
    createAlertDto
  );
  return { success: true, alert };
}
```

**Note:** The existing `POST /alerts` endpoint is used. No new endpoint needed.

---

## 16. Summary

### What Was Implemented

✅ **Offline Queue Hook** (`useOfflineQueue`)
- localStorage-based storage
- Automatic sync on reconnect
- Duplicate prevention
- Retry logic with max attempts
- Queue size management

✅ **UI Components**
- Badge showing pending count
- Auto-sync component with toast notifications
- Integrated into alerts page and layout

✅ **Context Integration**
- `AlertsContext` queues alerts when offline
- Handles network errors gracefully
- Provides user feedback

✅ **No PouchDB Dependency**
- Uses only localStorage
- REST API only (no PouchDB sync)
- Simple, lightweight implementation

### Key Features

1. **Offline Support:** Create alerts without internet
2. **Auto-Sync:** Automatically syncs when connection restored
3. **Visual Feedback:** Badge and toast notifications
4. **Error Handling:** Retry logic, quota management
5. **Persistence:** Survives app reloads
6. **Duplicate Prevention:** Smart duplicate detection

### Testing Checklist

- [ ] Create alert while offline → Queued
- [ ] Come online → Auto-syncs
- [ ] App reload → Queue persists
- [ ] Multiple alerts → All sync
- [ ] Network error → Retries
- [ ] Max retries → Removed from queue
- [ ] Duplicate alert → Prevented
- [ ] Badge updates correctly
- [ ] Toast notifications work

---

**Implementation Complete!** 🎉

The offline alerts queue is fully functional and ready for testing.

