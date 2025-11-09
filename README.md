# LifeLine 🚨

**Offline-first emergency communication and resource app** - A Progressive Web App (PWA) that works seamlessly online and offline, with real-time location tracking and emergency resource management.

## 🔥 Latest changes

- **Unified Emergency Contacts System (NEW!)**: Emergency contacts from the Socialize page now work for both notifications AND offline calling. Single source of truth with offline-first support, auto-sync, and call functionality. No more duplicate contact systems!
- **Offline Mode Page (NEW!)**: Dedicated offline mode page accessible from Profile, allowing users to view and call emergency contacts even without internet connection.
- **Voice-to-Alert AI**: Record up to 10s audio and auto-create SOS alerts via AI classification. Email notifications to emergency contacts with comprehensive alert details. Offline queue support.
- **OTP-Based Password Reset**: New secure password reset flow using email-based OTP verification. Users can request a 6-digit OTP code, verify it, and reset their password securely. Complete modal interface with multi-step process.
- **Enhanced Members List UI**: Improved light mode colors and contrast for better readability. White background with darker text, professional styling with better shadows and borders.
- **Admin Member Management**: Group admins can now remove members from groups permanently (with restrictions: cannot remove owner or themselves).
- **Member Location Viewing**: Click any member card to view their last known location with interactive map modal.
- **Enhanced Authentication UI**: Complete redesign of login/register page with modern styling, improved dark mode support, and better user experience.
- **Professional Dark Mode**: Upgraded to black-based dark theme with improved contrast and visibility across all components.
- Unified member status comes from global MongoDB status; removed per‑group updates.
- Invitations: list, accept/decline, navigate to group details from modal, preview before joining.
- Group management: admins/owners can edit name, description, and type.
- Leaving groups: any member can leave; owner blocked if other members remain.
- Performance: reduced dev memory usage; dynamic import for invitations modal; quieter backend logs.
- Group chat: Dedicated page at `groups/[id]/chat` with REST endpoints (`GET/POST /groups/:id/messages`).
- Light/Dark UX: fixed chat light-mode backgrounds; compact Invite/Back buttons.

## 🌟 Features

### 📱 **Progressive Web App (PWA)**
- **Installable** - Add to home screen on mobile devices
- **Offline-first** - Works without internet connection
- **Service Worker** - Caches resources for offline use
- **Responsive Design** - Mobile-optimized with hamburger menu
- **Dark Mode** - Toggle between light and dark themes with smooth transitions

### 🗺️ **Live Location & Maps**
- **Real-time Geolocation** - Track your current location
- **Live Map Page** - Interactive map with accuracy circle
- **Save Tiles Offline** - Cache map tiles for offline use
- **Share Location** - Share your live location via native sharing
- **External Maps Integration** - Open in Google/Apple Maps

### 🏥 **Emergency Resources** (ENHANCED!)
- **Dynamic Resource Search**:
  - Search all resources within a user-selectable radius (5, 10, 15, 25, 50, 100 km)
  - Real-time distance calculation using Haversine formula
  - Multiple resource types: hospitals, shelters, police, fire stations
  - Up to 30 resources displayed based on radius
- **Improved UI/UX**:
  - Beautiful radius selector with gradient styling
  - Location display showing "X resources within Y km"
  - Responsive design for web and mobile
  - Enhanced filter buttons with better visual feedback
  - Improved resource cards with map previews
- **Offline Resource Cache** - Save areas for offline access
- **Interactive Maps** - Visual resource locations on each card
- **Contact Integration** - Direct phone calls to emergency services

### 📚 **Emergency Guides** (NEW!)
- **Dynamic Location-Based Emergency Numbers**:
  - Automatic location detection via geolocation API
  - Reverse geocoding to determine user's country
  - Country-specific emergency numbers for 50+ countries
  - Fallback to universal numbers (112/911) if location unavailable
- **Features**:
  - Emergency services, Fire Department, and Poison Control numbers
  - Click-to-call links for quick access
  - Location reset button to re-detect location
  - Loading states and error handling
  - Local storage caching for offline access

### 🔄 **Offline-First Sync**
- **PouchDB Integration** - Local database with cloud sync
- **Per-User Databases** - Isolated data per user
- **Automatic Sync** - Background synchronization when online
- **Conflict Resolution** - Smart handling of data conflicts

### 🚨 **Emergency Alerts System** (Enhanced!)
- **Real-time Alerts** - Create and share emergency alerts instantly
- **Offline Alert Creation** - Create alerts without internet connection
- **Automatic Sync** - Alerts sync to server when connection restored
- **Multi-user Support** - View alerts from all users in the system
- **Alert Management** - Update and delete alerts with online-only restriction
- **Custom UI Components** - Professional confirmation modals and notification toasts
- **Alert Categories** - Organize alerts by type (Medical, Fire, Security, etc.)
- **Severity Levels** - Low, Medium, High priority classification
- **Expiration Handling** - Automatic cleanup of expired alerts
- **Comment & Reply System** - Full discussion functionality with threaded replies
  - Add comments to any alert
  - Reply to comments with visual nesting
  - Edit and delete your own comments
  - Alert creator moderation controls
  - Professional UI with avatars and badges

### 👥 **Groups & Collaboration** (ENHANCED!)
- **Group Management**: Create, edit, and delete groups with customizable names, descriptions, and types (Family, Friends, Work, Other)
- **Member Invitations**: Send invitations to other users to join your groups
- **Invitation System**: View, accept, decline, and preview invitations before joining
- **Role Management**: Group owners and admins can manage member roles
- **Admin Permissions**: 
  - Admins can remove members from groups permanently
  - Cannot remove group owner or themselves
  - Full member management capabilities
- **Member Location Viewing**: Click any member card to view their last known location with interactive map modal
- **Group Chat**: Dedicated chat page for group communication (`groups/[id]/chat`)
  - Edit and delete your own messages
  - Share alerts to group chats
  - Delete shared alerts from chat (without deleting original alert)
  - Responsive design for mobile and web
  - Auto-refresh with scroll position preservation
- **Leave Group**: Members can leave groups (owners restricted if other members exist)
- **Status Tracking**: View member statuses (Safe, Need Help, In Danger, Offline, Unknown) in real-time
- **Member Status Icons**: Visual indicators for each member's current status
- **Unified Status System**: Member statuses sync from global MongoDB status collection

### 📞 **Emergency Contacts** (NEW! - Unified System)
- **Dual Purpose**: Same contacts used for both emergency notifications AND offline calling
- **Offline-First**: Contacts stored locally in localStorage for offline access
- **Call Functionality**: "Call" button on each contact card opens native dialer
- **Auto-Sync**: Contacts automatically sync when connection is restored
- **Offline Support**: Add, edit, delete contacts while offline - syncs when online
- **Notification Integration**: These contacts receive emergency alerts via email when you create alerts
- **Manage in Socialize**: All contact management happens in the Socialize page
- **Offline Mode Page**: View and call contacts from dedicated offline mode page (accessible from Profile)
- **No Duplication**: Single unified system eliminates confusion between notification and calling contacts

### 🔐 **Security & Authentication**
- **JWT Authentication** - Secure user sessions
- **User Isolation** - Data separation between users
- **HTTPS Support** - Secure connections for mobile geolocation
- **Profile Management** - Update username and email with validation
- **OTP-Based Password Reset** (NEW!) - Secure password recovery with email OTP verification
  - Request 6-digit OTP code via email
  - Verify OTP before password reset
  - 15-minute OTP expiration for security
  - Professional multi-step modal interface
  - Full dark/light mode support
  - Mobile-responsive design
- **Enhanced Auth UI** - Modern, professional login/register interface with improved dark mode support

### 🎙️ Voice-to-Alert AI (NEW!)
- **Audio Capture**: Up to 10 seconds recording from the browser
- **STT Adapter**: Whisper (online) or Vosk (offline/mock)
- **Intent Classification**: Detect SOS/category/severity/confidence
- **Location**: Send explicit lat/lon or fallback to last known
- **Alert Creation**: Reuses Alerts schema; stores `aiMetadata` and `notifiedContacts`
- **Email Notifications**: Professional HTML email alerts via Nodemailer with location, transcript, category, and urgency level
- **Queue & Retry**: Simple queued notifications for failures/offline
- **Endpoints**: `POST /voice-alert/process`, `POST /voice-alert/testNotify`
- **Contacts CRUD**: `GET/POST/PUT/DELETE /contacts`

### 🎨 **User Interface & Experience**
- **Dark Mode Support** - Complete theme switching with proper contrast
- **Responsive Design** - Optimized for mobile and desktop
- **Smooth Animations** - Transitions and hover effects
- **Accessibility** - High contrast text and proper color schemes
- **Modern UI** - Clean, intuitive interface with emergency-focused design
- **Softer Dark Mode Colors** - Eye-friendly palette optimized for extended use
- **Theme Toggle** - Available on login/register page and profile
- **Accurate Sync Status** - Real-time display of data synchronization state

## 🚀 Quick Start

### Recent Improvements (Latest Update)

#### 🚨 **Emergency Alerts System** (ENHANCED!)
- **Complete Alerts Infrastructure**: Full-featured emergency alert system
  - Create alerts with title, description, category, and severity
  - **Update alerts** - Edit your existing alerts with a professional modal
  - Delete your own alerts
  - Report alerts from other users
  - Real-time synchronization between frontend and backend
  - Offline-first architecture with automatic sync when online
  - Multi-user support - view alerts from all users
- **Interactive Map Features**:
  - **My Location button** - Quickly center map on your current location
  - **Category-specific icons** - Each alert type has its own emoji icon
  - **Clickable alert popups** - Click alert markers to view details and navigate to full alert
  - **User location marker** - Shows your position with accuracy circle
  - **Alert filtering** - Filter by category and severity
- **Professional UI Components**: Custom-built user interface elements
  - Confirmation modal for alert deletion (replaces browser dialogs)
  - Notification toast system for user feedback (replaces browser alerts)
  - Dark/light mode support with proper theming
  - Center-positioned notifications for better visibility
- **Smart Offline Handling**: Robust offline-first functionality
  - Create alerts offline - they're queued and synced when online
  - Delete and update alerts only when online (prevents data inconsistency)
  - Automatic sync when app comes back online
  - Visual indicators for offline/online states
- **Report Functionality**:
  - Report alerts from other users with feedback to backend
  - Duplicate reporting prevention
  - Automatic alert hiding after multiple reports (5+ reports)
  - Real-time report count sync with backend
- **Comment System (NEW!)**:
  - Add comments to any alert (including alert creators on their own alerts)
  - Edit and delete your own comments
  - Update comment functionality with professional modal
  - Character limit (500 characters) with real-time counter
  - Professional UI with avatars, timestamps, and badges
  - Visual "You" badge for own comments
  - Alert creator "You own this alert" badge for moderation context
- **Reply System (NEW!)**:
  - Reply to any comment with threaded conversations
  - Visual nesting with indentation (moved right)
  - Purple accent border and background for replies
  - "Replying to @username" indicator badge
  - Clear visual hierarchy between main comments and replies
  - Available to all users including alert creators
- **Alert Creator Moderation (NEW!)**:
  - Alert creators can delete any comment on their alerts
  - Visual "👮" icon with red styling for moderation actions
  - Clear tooltip indicating moderation vs self-deletion
  - Full control over discussion on their alerts

#### 👤 **Profile Management **
- **Profile Update Feature**: Users can now edit their username and email
  - Edit mode with save/cancel functionality
  - Real-time validation and duplicate checking
  - Offline protection (requires internet connection)
  - Success/error feedback with proper styling
- **Enhanced Profile Page**: Improved UI with better text contrast
  - All profile information now displays in black for maximum readability
  - Consistent styling across light and dark modes
  - Professional card-based layout with clear information hierarchy

#### 🎨 **UI/UX Enhancements**
- **Comprehensive Dark Mode Button Styling**:
  - Universal dark mode rules for consistent button appearance
  - White buttons: Black text (except Delete/Report = red text)
  - Colorful buttons (blue, green, orange, etc.): Light backgrounds with black text
  - Red buttons (Logout, Clear All Data): Keep red background with white text
  - Yellow buttons (Forgot password): Keep yellow background with white text
  - Theme toggle and Edit buttons: Black text in dark mode
  - Applied across all pages: Alerts, Status, History, Maps, Resources, etc.
- **Improved Dark Mode Colors**: Replaced harsh slate tones with softer, eye-friendly blue-gray palette
  - Background: `#1a1f2e` (was `#0f172a`)
  - Surfaces: `#252b3b` / `#2d3548` (was `#1e293b` / `#334155`)
  - Text: `#f1f5f9` / `#cbd5e1` (was `#f8fafc` / `#e2e8f0`)
  - Better contrast and reduced eye strain
- **Theme Toggle on Login Page**: Dark/Light mode switch now available on authentication page
- **Status Page Dark Mode**: Full dark mode support with proper contrast

#### 🔧 **Bug Fixes & Improvements**
- **Fixed Sync Status Accuracy**: Status page now correctly displays "Synced"/"Offline" status
  - Previously always showed "Offline" despite successful sync
  - Now reads from actual PouchDB data
- **Automatic Sync on Reconnect**: App now automatically syncs when coming back online
  - Triggers sync when `isOnline` changes from false to true
  - Fixes issue where status remained "Offline" after reconnecting to internet
  - No more manual sync needed after going offline and back online
- **Offline Detection**: Improved online/offline status detection across all pages
  - Periodic checks every 5 seconds
  - Consistent API URL usage (WiFi IP)
- **SSR Compatibility**: Fixed "self is not defined" error during server-side rendering
  - PouchDB imports now only on client side
- **Error Handling**: Better error messages and fallbacks for network issues

### Prerequisites
- Node.js 18+ 
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Helmi-Megdiche/Lifeline.git
   cd Lifeline
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd lifeline-backend
   npm install
   
   # Frontend
   cd ../lifeline-app
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend - Create .env file
   cd lifeline-backend
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

4. **Start the applications**
   ```bash
   # Terminal 1 - Backend
   cd lifeline-backend
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd lifeline-app
   npm run dev
   ```

5. **Access the app**
   - **Desktop**: http://localhost:3000
   - **Mobile**: http://[YOUR_IP]:3000 (see Mobile Access section)

## 📱 Mobile Access

### For Mobile Testing

1. **Find your network IP**
   ```bash
   # Windows
   ipconfig
   
   # Look for WiFi adapter IPv4 Address
   # Example: 10.133.250.197
   ```

2. **Update configuration** (if needed)
   ```bash
   # The app automatically uses your WiFi IP
   # Check lifeline-app/src/lib/config.ts
   ```

3. **Access from mobile**
   ```
   http://[YOUR_IP]:3000
   # Example: http://10.133.250.197:3000
   ```

### HTTPS for Geolocation (Mobile)

Mobile browsers require HTTPS for geolocation. Choose one option:

#### Option A: Chrome Flag (Easiest)
1. Open Chrome on mobile
2. Go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Add: `http://[YOUR_IP]:3000`
4. Restart Chrome

#### Option B: HTTPS Setup
```bash
cd lifeline-app
npm run setup-https
npm run dev:https
# Then use: https://[YOUR_IP]:3000
```

#### Option C: ngrok (Recommended)
```bash
npm install -g ngrok
ngrok http 3000
# Use the HTTPS URL provided by ngrok
```

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Database**: PouchDB (local) + IndexedDB (legacy)
- **Maps**: Leaflet with React-Leaflet
- **PWA**: next-pwa with custom service worker

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with Passport
- **Sync Protocol**: CouchDB-compatible PouchDB endpoints
- **CORS**: Configured for mobile access
- **Email Service**: Nodemailer integration for password reset emails
- **Profile Management**: RESTful API for user profile updates

### Data Model
- **Single Document per User**: `user_<userId>_status`
- **Status History**: Local-only array for offline changes
- **Revisions**: CouchDB-style `_rev` for conflict resolution
- **User Isolation**: JWT-enforced data separation

## 🔧 Development

### Available Scripts

#### Frontend (`lifeline-app`)
```bash
npm run dev          # Start development server
npm run dev:https    # Start with HTTPS (requires certificates)
npm run build        # Build for production
npm run start        # Start production server
npm run setup-https  # Generate HTTPS certificates
```

#### Backend (`lifeline-backend`)
```bash
npm run start:dev    # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
```

### Key Directories

```
lifeline-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── alerts/         # Emergency alerts page
│   │   ├── map/            # Live location map
│   │   ├── resources/      # Emergency resources
│   │   └── ...
│   ├── components/         # React components
│   │   ├── ConfirmationModal.tsx  # Custom confirmation dialog
│   │   └── NotificationToast.tsx   # Custom notification system
│   ├── hooks/              # Custom React hooks
│   │   ├── usePouchDB.ts   # PouchDB initialization
│   │   └── useSync.ts      # Sync management
│   ├── lib/                # Utilities and configurations
│   │   ├── pouchdb.ts      # PouchDB helpers
│   │   └── config.ts       # API configuration
│   └── contexts/           # React contexts
│       └── AlertsContext.tsx  # Alerts state management
├── public/
│   ├── sw.js               # Service worker
│   └── manifest.json        # PWA manifest
└── setup-https.js          # HTTPS certificate setup

lifeline-backend/
├── src/
│   ├── alerts/             # Emergency alerts module
│   │   ├── alerts.controller.ts  # Alerts API endpoints
│   │   ├── alerts.service.ts    # Alerts business logic
│   │   └── alerts.module.ts     # Alerts module configuration
│   ├── auth/               # Authentication module
│   ├── dto/                # Data Transfer Objects
│   │   └── alert.dto.ts    # Alert data validation
│   ├── pouch/              # PouchDB-compatible endpoints
│   ├── schemas/            # MongoDB schemas
│   │   └── alert.schema.ts # Alert data model
│   ├── status/             # Status management
│   └── main.ts             # Application entry point
└── dist/                   # Compiled JavaScript
```

## 🧪 Testing

### Manual Testing Checklist

#### ✅ **Core Functionality**
- [ ] User registration and login
- [ ] Status updates (Safe/Help)
- [ ] Offline status updates
- [ ] Online synchronization
- [ ] Data persistence across sessions

#### ✅ **Alerts System**
- [ ] Create alerts with different categories and severity levels
- [ ] View alerts from all users
- [ ] Update existing alerts
- [ ] Delete own alerts (online only)
- [ ] Report alerts from other users
- [ ] Offline alert creation and sync
- [ ] Custom confirmation modal for deletions
- [ ] Notification toast system
- [ ] Alert expiration handling
#### ✅ **Comments & Replies System (NEW!)**
- [ ] Add comments to any alert
- [ ] Alert creators can comment on their own alerts
- [ ] Edit and delete your own comments
- [ ] Reply to any comment with threaded structure
- [ ] Visual nesting and indentation for replies
- [ ] Purple accent styling for reply indicators
- [ ] Alert creator moderation (delete any comment)
- [ ] Character limit and real-time counter
- [ ] Professional UI with avatars and badges

#### ✅ **Emergency Contacts (Unified System)**
- [ ] Add contacts in Socialize page
- [ ] Call contacts using "Call" button
- [ ] View contacts in offline mode page
- [ ] Add/edit/delete contacts while offline
- [ ] Contacts sync automatically when online
- [ ] Contacts receive emergency alert notifications via email

#### ✅ **Mobile Features**
- [ ] Responsive design on mobile
- [ ] Hamburger menu navigation
- [ ] Touch-friendly buttons
- [ ] Geolocation permission handling
- [ ] Live map functionality

#### ✅ **PWA Features**
- [ ] Install prompt appears
- [ ] App installs to home screen
- [ ] Offline page loads
- [ ] Service worker caches resources
- [ ] Background sync works

#### ✅ **Maps & Resources**
- [ ] Live location tracking
- [ ] Emergency resources display
- [ ] Map tiles cache offline
- [ ] Share location functionality
- [ ] External maps integration

### Automated Testing
```bash
# Backend tests
cd lifeline-backend
npm run test

# Frontend tests (if configured)
cd lifeline-app
npm run test
```

## 🚀 Deployment

### Production Build
```bash
# Backend
cd lifeline-backend
npm run build
npm run start

# Frontend
cd lifeline-app
npm run build
npm run start
```

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/lifeline
JWT_SECRET=your-secret-key
PORT=4004

# Email Configuration (for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend (next.config.js)
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request password reset (legacy token-based)
- `POST /auth/reset-password` - Reset password with token (legacy)
- `POST /auth/forgot-password-otp` - Request password reset OTP (sends 6-digit code via email)
- `POST /auth/verify-otp` - Verify OTP code for password reset
- `POST /auth/reset-password-otp` - Reset password with verified OTP
- `PUT /auth/profile` - Update user profile (username/email)

#### Status Management
#### Voice-to-Alert
- `POST /voice-alert/process` — multipart form-data: `audio`, optional `latitude`, `longitude`, `userId`
- `POST /voice-alert/testNotify` — body `{ userId }`

#### Contacts (Unified System)
- `GET /contacts` — list user's contacts (used for both notifications and offline calling)
- `POST /contacts` — add contact `{ userId, name, phone, email?, methods? }`
- `PUT /contacts/:id` — update contact
- `DELETE /contacts/:id` — delete contact
- **Note**: Contacts are cached locally in `localStorage` for offline access and automatically sync when online
- `POST /status` - Create/update status
- `GET /status/user/:userId` - Get user status
- `GET /status/sync` - Get sync status
- `GET /status/user/:userId/latest` - Get latest status with location data

#### Groups Management
- `POST /groups` - Create a new group
- `GET /groups` - Get all groups for authenticated user
- `GET /groups/:id` - Get group details with members
- `PUT /groups/:id` - Update group (name, description, type) - admin/owner only
- `DELETE /groups/:id` - Delete group - owner only
- `POST /groups/:id/members` - Add member to group - admin/owner only
- `DELETE /groups/:id/members/:userId` - Remove member from group - admin only (cannot remove owner or self)
- `POST /groups/:id/leave` - Leave a group
- `POST /groups/:id/messages` - Send message to group chat
- `GET /groups/:id/messages` - Get group chat messages

#### Invitations
- `POST /invitations` - Create invitation (send invite to user)
- `GET /invitations/my` - Get user's pending invitations
- `GET /invitations/:id/preview` - Preview group details before accepting
- `POST /invitations/:id/accept` - Accept an invitation
- `POST /invitations/:id/decline` - Decline an invitation

#### Alerts Management
- `POST /alerts` - Create new alert
- `GET /alerts` - Get all alerts
- `GET /alerts/my` - Get user's own alerts
- `PUT /alerts/:id` - Update existing alert (online only)
- `PUT /alerts/:id/report` - Report an alert
- `DELETE /alerts/:id` - Delete alert (online only)

#### Comments & Replies (NEW!)
- `POST /alerts/:id/comment` - Add a comment to an alert
- `PUT /alerts/:id/comment/:commentIndex` - Update a comment (comment owner only)
- `DELETE /alerts/:id/comment/:commentIndex` - Delete a comment (comment owner or alert creator)

#### PouchDB Sync
- `POST /pouch/status/_bulk_docs` - Bulk document operations
- `POST /pouch/status/_revs_diff` - Revision difference check
- `GET /pouch/status/_changes` - Change feed

#### Alerts PouchDB Sync
- `POST /alerts/pouch/_bulk_docs` - Bulk alerts operations
- `GET /alerts/pouch/_changes` - Alerts change feed
- `POST /alerts/pouch/_revs_diff` - Alerts revision difference
- `GET /alerts/pouch/_local/:docId` - Get local alert document
- `PUT /alerts/pouch/_local/:docId` - Update local alert document
- `GET /alerts/pouch/:docId` - Get alert document
- `POST /alerts/pouch/_bulk_get` - Bulk get alerts
- `GET /alerts/pouch/_all_docs` - Get all alerts documents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the troubleshooting section below

## 🔧 Troubleshooting

### Common Issues

#### Mobile Geolocation Not Working
- **Issue**: "Only secure origins are allowed"
- **Solution**: Use HTTPS (see Mobile Access section)

#### Sync Not Working
- **Issue**: Data not syncing between devices
- **Solution**: Check JWT token and network connectivity

#### PWA Not Installing
- **Issue**: Install prompt not appearing
- **Solution**: Ensure service worker is registered and manifest is valid

#### Maps Not Loading Offline
- **Issue**: Map tiles not cached
- **Solution**: Use "Save tiles for offline" button on Live Map page

### Debug Mode
```bash
# Enable debug logging
# Frontend: Check browser console
# Backend: Check terminal output for PouchDB sync logs
```

---

**Built with ❤️ for emergency preparedness and community safety**
