# Delete Group 403 Error Fix

## Issue

**Error:** Getting 403 (Forbidden) when syncing DELETE_GROUP actions that were created offline.

**Root Cause:** When deleting a group offline, the action is queued. When coming back online, the sync tries to delete the group from the backend. However:
1. The user might not be admin/owner anymore
2. The group might have already been deleted by another admin
3. The permission check on backend returns 403

This creates a noisy error message and repeatedly tries to sync a failing action.

## Solution

**Approach:** Detect 403 errors and automatically remove them from the sync queue since they won't succeed.

**Changes in `lifeline-app/src/contexts/GroupsContext.tsx`:**

```typescript
// Improved error handling in syncPendingActions()
if (response.ok) {
  await offlineSyncManager.markActionAsSynced(action.id);
  console.log('✅ Synced action:', action.action);
} else {
  const errorText = await response.text();
  console.error('❌ Failed to sync action:', action.action, 'Status:', response.status, errorText);
  
  // If it's a permission error (403), remove the action since it won't work
  if (response.status === 403) {
    console.warn('⚠️ Permission denied - removing action from queue');
    await offlineSyncManager.markActionAsSynced(action.id);
  }
}
```

## How It Works

1. **Normal sync:** Actions that succeed (200 OK) are marked as synced and removed
2. **Temporary failures:** Network errors, timeouts, etc. - action stays in queue for retry
3. **Permission errors (403):** Automatically removed from queue since retrying won't help
4. **Other errors:** Stay in queue for potential retry

## Why This Matters

### Before Fix
- 403 errors would keep retrying indefinitely
- Console would be noisy with permission errors
- User confused by "Failed to sync" messages

### After Fix
- 403 errors are silently removed
- Only retries on recoverable errors (network issues)
- Cleaner console logs
- Better user experience

## Test Scenario

1. Create a group as user A
2. Go offline
3. Delete the group (queued for sync)
4. Come back online
5. If user is no longer admin, the delete would fail with 403
6. ❌ **Before:** Error logs, retries indefinitely
7. ✅ **After:** Silently removes from queue

## Additional Improvements

- Added error text logging to see actual error messages
- Better debugging info
- Automatic cleanup of non-recoverable errors

