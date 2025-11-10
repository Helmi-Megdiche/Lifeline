# LifeLine 🚨

**Offline-First Emergency Communication & Resource Platform**

LifeLine is a Progressive Web App (PWA) designed for reliable communication and coordination during emergencies — even with **no internet access**. It provides real-time location sharing, emergency alerts, voice-activated distress signals, offline contacts, and community group collaboration.

---

## ✨ Key Features

### 📱 Progressive Web App (PWA)
- Installable on mobile and desktop
- Works fully **offline**
- Smart local caching & background sync
- Optimized for mobile emergency use
- Full dark & light mode support

### 🆘 Emergency Alerts System
- Create alerts with **category & severity**
- Works offline and auto-syncs when reconnected
- Real-time multi-user alerts feed
- Map-based alert visualization
- **Comments + threaded replies** per alert
- Alert creators can **moderate comments**

### 🎤 Voice-to-Alert AI
- Record up to 10 seconds of audio
- Automatic SOS message detection & categorization
- Includes location + confidence scoring
- Sends **email notifications** to emergency contacts

### 👥 Groups & Collaboration
- Create and join safety groups
- Role-based permissions (Owner / Admin / Member)
- **Group chat** with message editing & deletion
- View each member's last known location
- Status indicators: Safe / Need Help / In Danger / Offline

### 📞 Unified Emergency Contacts (Online + Offline)
- Store contacts locally for offline use
- Call contacts directly from the app
- These same contacts receive **alert notifications**
- Syncs automatically when back online

### 🗺️ Maps & Emergency Resources
- Real-time location tracking
- Search nearby hospitals, police, fire stations, shelters
- Distance-based filtering (5-100 km radius)
- **Map tiles can be saved for offline navigation**
- Open in Google/Apple Maps

### 📚 Location-Based Emergency Guides
- Auto-detect country from GPS
- Show correct emergency numbers per region
- Cached for offline access

---

## 🧱 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | **Next.js 15**, React, Tailwind CSS, Leaflet, Service Worker |
| Backend | **NestJS**, MongoDB, JWT Auth |
| Local DB | **PouchDB + IndexedDB**, CouchDB-style sync |
| Email / AI | Nodemailer, Whisper/Vosk (STT classification) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### 1) Clone Repository
   ```bash
   git clone https://github.com/Helmi-Megdiche/Lifeline.git
   cd Lifeline
   ```

### 2) Install Dependencies
   ```bash
   # Backend
   cd lifeline-backend
   npm install
   
   # Frontend
   cd ../lifeline-app
   npm install
   ```

### 3) Configure Environment Variables

**Backend** (`lifeline-backend/.env`):
```bash
MONGODB_URI=mongodb://localhost:27017/lifeline
JWT_SECRET=your-secret-key
PORT=4004

# Email Configuration (for password reset & alerts)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Voice Alert Configuration
OPENAI_API_KEY=your-openai-key  # For Whisper STT
VOSK_URL=http://localhost:2700/stt  # For local Vosk
STT_PROVIDER=whisper  # or 'vosk'
```

**Frontend** (`lifeline-app/.env.local`):
   ```bash
NEXT_PUBLIC_API_URL=http://localhost:4004
   ```

### 4) Run Development
   ```bash
   # Terminal 1 - Backend
   cd lifeline-backend
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd lifeline-app
   npm run dev
   ```

**Access the App:**
   - **Desktop**: http://localhost:3000
- **Mobile** (same Wi-Fi): http://YOUR_LOCAL_IP:3000

**For HTTPS on Mobile** (required for geolocation):
```bash
# Option 1: Use ngrok
ngrok http 3000

# Option 2: Use built-in HTTPS
cd lifeline-app
npm run setup-https
npm run dev:https
```

---

## 📂 Project Structure

```
lifeline-app/          # Next.js frontend
  src/app/             # Application routes
  src/components/      # Shared UI components
  src/hooks/           # Custom hooks (PouchDB, Sync)
  src/lib/             # Config & utilities
  public/              # Service worker / manifest

lifeline-backend/      # NestJS backend
  src/alerts/          # Alerts & comments APIs
  src/auth/            # Login / Register / OTP password reset
  src/groups/          # Group management & chat
  src/contacts/        # Unified contacts system
  src/voice-alert/     # AI voice alert processing
  src/status/          # Status management
  src/pouch/           # PouchDB sync endpoints
```

---

## 📡 Key API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password-otp` - Request password reset OTP
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/reset-password-otp` - Reset password with OTP
- `PUT /auth/profile` - Update user profile

### Emergency Contacts
- `GET /contacts` - List user's contacts
- `POST /contacts` - Add contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact

### Alerts
- `POST /alerts` - Create new alert
- `GET /alerts` - Get all alerts
- `PUT /alerts/:id` - Update alert
- `DELETE /alerts/:id` - Delete alert
- `POST /alerts/:id/comment` - Add comment to alert
- `PUT /alerts/:id/comment/:commentIndex` - Update comment
- `DELETE /alerts/:id/comment/:commentIndex` - Delete comment

### Groups
- `POST /groups` - Create group
- `GET /groups` - Get user's groups
- `GET /groups/:id` - Get group details
- `POST /groups/:id/messages` - Send message to group chat
- `GET /groups/:id/messages` - Get group chat messages

### Voice Alert
- `POST /voice-alert/process` - Process audio and create alert

### Status
- `POST /status` - Create/update status
- `GET /status/user/:userId` - Get user status

---

## 🧪 Testing

```bash
# Backend tests
cd lifeline-backend
npm run test
npm run test:e2e
```

---

## 📱 Mobile Access

For testing on mobile devices:

1. **Find your local IP address:**
```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   ```

2. **Access from mobile** (same Wi-Fi network):
   ```
   http://YOUR_IP:3000
   ```

3. **Enable HTTPS** (required for geolocation):
   - Use ngrok: `ngrok http 3000`
   - Or use built-in HTTPS setup (see Getting Started)

---

## 🔧 Development Scripts

### Frontend
```bash
npm run dev          # Start development server
npm run dev:https    # Start with HTTPS
npm run build        # Build for production
npm run start        # Start production server
npm run setup-https  # Generate HTTPS certificates
```

### Backend
```bash
npm run start:dev   # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run test        # Run tests
```

---

## 🛠️ Troubleshooting

### Mobile Geolocation Not Working
- **Issue**: "Only secure origins are allowed"
- **Solution**: Use HTTPS (ngrok or built-in HTTPS setup)

### Sync Not Working
- Check JWT token and network connectivity
- Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check backend CORS configuration

### PWA Not Installing
- Ensure service worker is registered
- Verify `manifest.json` is valid
- Check browser console for errors

### Maps Not Loading Offline
- Use "Save tiles for offline" button on Live Map page
- Ensure map tiles are cached before going offline

---

## 📄 License

MIT License — free for personal & commercial use.

---

**❤️ Built For Real-World Emergency Readiness**
