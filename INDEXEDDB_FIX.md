# IndexedDB Storage Quota Fix

## Problem
The app was crashing with the following errors:
- `indexed_db_went_bad` error when importing PouchDB
- `QuotaExceededError` - Browser storage quota exceeded

## Root Cause
PouchDB uses IndexedDB for browser-side storage. When too much data accumulates (especially old alerts and their revision history), the browser's storage quota can be exceeded, causing the app to crash.

## Solution Implemented

### 1. Error Handling
Added graceful error handling in `AlertsContext.tsx`:
- Catches `QuotaExceededError` during database operations
- Displays user-friendly error messages instead of crashing
- Provides a "Clear Old Data" button to free up storage

### 2. Automatic Old Data Cleanup
Added `clearOldData()` function that:
- Identifies expired alerts and alerts older than 4 weeks
- Automatically deletes them to free up storage
- Shows a notification with the number of alerts cleared

### 3. User Interface
Added an error banner that appears when storage quota is exceeded:
- Red alert box at the bottom of the screen
- "Clear Old Data" button to fix the issue
- "Dismiss" button to temporarily ignore the error

### 4. Storage Cleanup Tool
Created `clear-indexeddb.html` - a standalone utility that:
- Lists detected Lifeline databases
- Allows clearing all Lifeline databases safely
- Provides a "nuclear option" to clear ALL IndexedDB storage
- Can be used when the app won't load due to quota errors

## How to Use

### If the App is Running
1. Wait for the error message to appear at the bottom of the screen
2. Click "Clear Old Data" to automatically remove old alerts
3. The app will continue working normally

### If the App Won't Load
1. Open `clear-indexeddb.html` in your browser (you can open it even when the app is broken)
2. Review the detected databases
3. Click "Clear All Lifeline Databases"
4. Wait for the success message
5. Return to the app and refresh the page

### Manual Browser Method
If you prefer to use browser tools:
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** in the left sidebar
4. Right-click on databases starting with `lifeline-` or `_pouch_lifeline-`
5. Select **Delete**
6. Refresh the page

## Technical Details

### What Gets Deleted
- **Expired alerts** (past their expiration date)
- **Old alerts** (older than 4 weeks)
- **PouchDB metadata** (sync checkpoints, etc.)

### What is Preserved
- Recent alerts (last 4 weeks)
- User preferences
- Authentication tokens
- Server data (sync will re-download if needed)

### Storage Limits
- Browsers typically limit IndexedDB storage to:
  - Chrome/Edge: 60% of available disk space
  - Firefox: 50% of available disk space
  - Safari: 1GB
- The app now actively manages storage to stay within these limits

## Prevention
The app now:
1. Automatically deletes expired alerts during regular operations
2. Filters out old alerts when fetching data
3. Shows warnings before quota is exceeded
4. Provides easy cleanup tools

## Files Modified
- `lifeline-app/src/contexts/AlertsContext.tsx` - Added error handling and cleanup function
- `clear-indexeddb.html` - New utility tool for emergency cleanup

## Testing
To test the fix:
1. Create alerts over time to accumulate data
2. Wait for quota error or trigger it manually
3. Use the "Clear Old Data" button
4. Verify the app continues working

## Future Improvements
- Implement automatic background cleanup
- Add storage usage display to user
- Set up periodic cleanup jobs
- Add bulk delete for very old data (3+ months)

## Support
If you continue to experience quota errors:
1. Open `clear-indexeddb.html`
2. Use the "Clear ALL IndexedDB" option
3. Clear browser cache (Ctrl+Shift+Delete)
4. Restart the app

