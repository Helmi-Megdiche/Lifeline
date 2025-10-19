# LifeLine 🚨

**Offline-first emergency communication and resource app** - A Progressive Web App (PWA) that works seamlessly online and offline, with real-time location tracking and emergency resource management.

## 🌟 Features

### 📱 **Progressive Web App (PWA)**
- **Installable** - Add to home screen on mobile devices
- **Offline-first** - Works without internet connection
- **Service Worker** - Caches resources for offline use
- **Responsive Design** - Mobile-optimized with hamburger menu

### 🗺️ **Live Location & Maps**
- **Real-time Geolocation** - Track your current location
- **Live Map Page** - Interactive map with accuracy circle
- **Save Tiles Offline** - Cache map tiles for offline use
- **Share Location** - Share your live location via native sharing
- **External Maps Integration** - Open in Google/Apple Maps

### 🏥 **Emergency Resources**
- **Nearby Services** - Find hospitals, shelters, police, fire stations
- **Offline Resource Cache** - Save areas for offline access
- **Interactive Maps** - Visual resource locations
- **Contact Integration** - Direct phone calls to emergency services

### 🔄 **Offline-First Sync**
- **PouchDB Integration** - Local database with cloud sync
- **Per-User Databases** - Isolated data per user
- **Automatic Sync** - Background synchronization when online
- **Conflict Resolution** - Smart handling of data conflicts

### 🔐 **Security & Authentication**
- **JWT Authentication** - Secure user sessions
- **User Isolation** - Data separation between users
- **HTTPS Support** - Secure connections for mobile geolocation

## 🚀 Quick Start

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
│   │   ├── map/            # Live location map
│   │   ├── resources/      # Emergency resources
│   │   └── ...
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   │   ├── usePouchDB.ts   # PouchDB initialization
│   │   └── useSync.ts      # Sync management
│   ├── lib/                # Utilities and configurations
│   │   ├── pouchdb.ts      # PouchDB helpers
│   │   └── config.ts       # API configuration
│   └── contexts/           # React contexts
├── public/
│   ├── sw.js               # Service worker
│   └── manifest.json        # PWA manifest
└── setup-https.js          # HTTPS certificate setup

lifeline-backend/
├── src/
│   ├── auth/               # Authentication module
│   ├── pouch/              # PouchDB-compatible endpoints
│   ├── schemas/            # MongoDB schemas
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

# Frontend (next.config.js)
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

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