# LifeLine - Update Log

## 🚀 Latest Updates & Features

### 🎤 **Emergency Voice Detection System** (Major Feature)

#### **App-Wide Voice Detection**
- **Background Listening**: Emergency voice detection now works app-wide when enabled from Profile settings
- **Real-time Speech Recognition**: Uses browser's native SpeechRecognition API for instant keyword detection
- **Automatic Alert Creation**: Detects emergency keywords ("help", "SOS", "emergency", "lifeline", etc.) and screams, then automatically creates alerts
- **User-Specific Settings**: Each user has their own independent Emergency Voice Detection setting stored in localStorage with user ID
- **Authentication-Aware**: Listener automatically stops when user logs out and only works when authenticated
- **Real-time Transcript Display**: Shows live transcription of detected speech in the indicator component
- **Smart Audio Monitoring**: Monitors audio amplitude for scream detection with configurable threshold
- **15-Second Recording**: Extended recording duration for better context capture

#### **Technical Implementation**
- **Global Listener Component**: `GlobalEmergencyListener` component integrated into app layout
- **Custom Hook**: `useEmergencyListener` hook manages all voice detection logic
- **Offline Queue Support**: Voice alerts are queued in localStorage when offline and synced when online
- **Client-Side STT**: Real-time transcription using browser SpeechRecognition API
- **Server-Side Processing**: Backend processes audio with Whisper API or Vosk for final transcription
- **AI Classification**: Enhanced keyword detection and emergency classification on backend
- **Location Integration**: Automatically includes user's current location with voice alerts

#### **UI Components**
- **Emergency Listener Indicator**: Floating indicator showing listening/recording status with real-time transcript
- **Profile Toggle**: Easy toggle switch in Profile page to enable/disable emergency detection
- **Status Messages**: Clear visual feedback for active/inactive states
- **Permission Handling**: Automatic microphone permission requests with user-friendly error messages

### 🐛 **Bug Fixes & Improvements**

#### **IndexedDB Error Handling**
- **Silent Error Suppression**: All `QuotaExceededError` and `indexed_db_went_bad` errors are now silently handled
- **Pre-Import Health Check**: IndexedDB health is tested before importing PouchDB to prevent errors
- **localStorage Flag**: Corrupted IndexedDB state is remembered in localStorage to skip future attempts
- **Authentication Check**: PouchDB only initializes when user is authenticated
- **Console Error Suppression**: Temporarily suppresses console errors during PouchDB initialization
- **Graceful Degradation**: App continues to work normally without PouchDB if IndexedDB is unavailable

#### **AudioContext Error Fix**
- **State Checking**: AudioContext is checked for closed state before attempting to close
- **Error Handling**: All AudioContext operations wrapped in try-catch blocks
- **Cleanup Improvements**: Proper cleanup of audio resources when stopping emergency detection

#### **UI/UX Enhancements**

**Light Mode Text Clarity**
- **Emergency Voice Detection Card**: 
  - Changed description text to `text-black` with `font-semibold` for maximum visibility
  - Title uses `font-bold` with `text-black`
  - Status messages use color-coded text (green for active, gray for inactive)
  - Restored original red/orange gradient background for visual appeal

**Map Popup Styling**
- **Light Mode Fix**: Map popups now display with white background and black text in light mode
- **Dark Mode Support**: Dark gray background with light text in dark mode
- **CSS Overrides**: Highly specific CSS rules to override Leaflet's default dark styling
- **DOM Manipulation**: Direct style injection via useEffect to ensure correct colors
- **Multiple Approaches**: Combination of CSS and JavaScript to force correct styling

**Description Visibility**
- **Alert Cards**: Improved description text contrast with darker colors and better backgrounds
- **Map Popups**: Enhanced description visibility with proper background colors and text styling

#### **User-Specific Settings**
- **Emergency Detection Per User**: Each user's Emergency Voice Detection setting is now stored separately
- **localStorage Key Format**: `lifeline:emergencyDetectionEnabled:${userId}` ensures user isolation
- **Default Behavior**: Settings default to `false` when no user-specific setting exists
- **Logout Cleanup**: Settings are reset when user logs out

### 🔧 **Technical Details

#### **PouchDB Initialization Improvements**
```typescript
// Early exit checks before any async operations
- Authentication check (user && token)
- IndexedDB availability check
- localStorage corruption flag check
- Health check before import
- Only import if all checks pass
```

#### **Emergency Listener Architecture**
```typescript
// Component hierarchy
GlobalEmergencyListener (app-wide)
  └── useEmergencyListener (hook)
      ├── SpeechRecognition (keyword detection)
      ├── AudioContext (amplitude monitoring)
      ├── MediaRecorder (audio capture)
      └── usePouchQueue (offline queue)
```

#### **Error Suppression Strategy**
1. **Prevention**: Health checks before operations
2. **Catching**: Try-catch blocks around all IndexedDB operations
3. **Suppression**: Console error/warn override during initialization
4. **Persistence**: localStorage flags to remember corrupted state

### 📝 **Code Quality Improvements**

- **Type Safety**: Improved TypeScript types for all new components
- **Error Boundaries**: Better error handling throughout the application
- **Code Organization**: Separated concerns between components, hooks, and contexts
- **Performance**: Optimized audio processing and reduced unnecessary re-renders
- **Accessibility**: Better contrast ratios and readable text in all modes

### 🔒 **Security Enhancements**

- **User Isolation**: Emergency detection settings are user-specific
- **Authentication Checks**: All sensitive operations require authentication
- **Permission Handling**: Proper microphone permission requests with user feedback
- **Data Privacy**: User-specific localStorage keys prevent data leakage between users

### 📱 **Mobile Optimizations**

- **Audio Constraints**: Optimized microphone settings for mobile devices
- **Battery Efficiency**: Efficient audio monitoring with configurable intervals
- **Network Handling**: Graceful offline/online transitions
- **Touch Interactions**: Improved toggle switches and buttons for mobile

## 🎯 **Breaking Changes**

None - All changes are backward compatible.

## 🔄 **Migration Notes**

### For Existing Users
- Emergency Voice Detection settings will default to `false` for all users
- Users need to manually enable the feature from Profile page
- Old global setting (if any) will be ignored in favor of user-specific settings

### For Developers
- `usePouchDB` hook now requires authentication before initialization
- Emergency detection settings must use user-specific localStorage keys
- IndexedDB errors are now silently handled - check localStorage for corruption flags

## 📚 **Documentation Updates**

- Added Emergency Voice Detection section to README
- Updated API documentation for voice alert endpoints
- Added troubleshooting section for IndexedDB errors
- Updated mobile access instructions

## 🧪 **Testing Recommendations**

### Emergency Voice Detection
- [ ] Test keyword detection with various phrases
- [ ] Test scream detection with different audio levels
- [ ] Test offline queue functionality
- [ ] Test user-specific settings isolation
- [ ] Test logout cleanup behavior
- [ ] Test microphone permission handling

### Error Handling
- [ ] Test with corrupted IndexedDB
- [ ] Test with full localStorage quota
- [ ] Test with no IndexedDB support
- [ ] Test authentication-required checks

### UI/UX
- [ ] Test light mode text visibility
- [ ] Test dark mode styling
- [ ] Test map popup colors in both modes
- [ ] Test responsive design on mobile

## 🚀 **Next Steps**

### Planned Features
- [ ] Voice alert transcription accuracy improvements
- [ ] Additional emergency keywords support
- [ ] Multi-language keyword detection
- [ ] Voice alert history and playback
- [ ] Enhanced audio quality settings

### Known Issues
- None currently reported

---

**Last Updated**: 2025-11-08
**Version**: 2.0.0

