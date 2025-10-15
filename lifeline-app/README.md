# LifeLine - Offline-First Emergency Communication App

LifeLine is an offline-first emergency communication and resources PWA built with Next.js 15, TypeScript, Tailwind, next-pwa, and Leaflet. It now uses a three-tier architecture with MongoDB persistence and PouchDB for automatic offline sync.

## Architecture

This project consists of two separate applications:

- **Frontend**: Next.js PWA (`lifeline-app`) - handles UI, offline storage via PouchDB, and automatic sync
- **Backend**: NestJS API (`lifeline-backend`) - handles MongoDB persistence, JWT authentication, and CouchDB-compatible sync endpoints

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

## Getting Started

### 1. Install MongoDB

**Local Installation:**
```bash
# Windows (using Chocolatey)
choco install mongodb

# macOS (using Homebrew)
brew install mongodb

# Ubuntu/Debian
sudo apt-get install mongodb
```

**Start MongoDB:**
```bash
# Windows
net start MongoDB

# macOS/Linux
mongod
```

**Or use MongoDB Atlas (cloud):**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster and get connection string
3. Update `MONGODB_URI` in backend `.env`

### 2. Frontend (Next.js PWA)

Navigate to the frontend directory:

```powershell
cd lifeline-app
npm install
npm run dev
```

Open http://localhost:3000

### 3. Backend (NestJS API)

Navigate to the backend directory:

```powershell
cd ../lifeline-backend
npm install
npm run start:dev
```

The backend runs on http://localhost:4000

### 4. Running Both Services

To run both frontend and backend simultaneously, open two terminal windows:

**Terminal 1 (Frontend):**
```powershell
cd lifeline-app
npm run dev
```

**Terminal 2 (Backend):**
```powershell
cd lifeline-backend
npm run start:dev
```

## Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_COUCH_SYNC_URL=http://localhost:4000/pouch/status
```

### Backend (.env)
```bash
MONGODB_URI=mongodb://localhost:27017/lifeline
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

## Features

### 🔐 Authentication
- JWT-based user authentication
- User registration and login
- Protected routes and API endpoints
- Persistent login sessions

### 📱 Offline-First Design
- **PouchDB**: Local database with automatic sync
- **IndexedDB**: Legacy offline storage (maintained for compatibility)
- **Background Sync**: Automatic sync when online
- **Service Worker**: Handles offline caching and sync queues

### 🗄️ Data Persistence
- **MongoDB**: Primary database for server-side storage
- **PouchDB**: Client-side database with CouchDB-compatible sync
- **Automatic Sync**: Two-way sync between local and remote databases
- **Conflict Resolution**: Handles sync conflicts gracefully

### 🚨 Emergency Features
- One-tap status reporting ("Safe" or "Need Help")
- GPS location capture for emergency responders
- Offline resource caching and management
- Emergency guides and procedures

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Status Management
- `POST /status` - Create emergency status (requires auth)
- `GET /status/all` - Get all statuses (requires auth)
- `GET /status/user/:userId` - Get user's statuses (requires auth)
- `GET /status/:id` - Get specific status (requires auth)

### PouchDB Sync (CouchDB-compatible)
- `GET /pouch/status` - Get all statuses for sync
- `GET /pouch/status/:id` - Get specific status document
- `POST /pouch/status` - Create status document
- `PUT /pouch/status/:id` - Update status document
- `DELETE /pouch/status/:id` - Delete status document

### Health Check
- `GET /health` - Server health check

## Data Models

### User Schema
```typescript
{
  email: string;
  password: string; // hashed
  name: string;
  isActive: boolean;
  lastCheckIn?: Date;
}
```

### Status Schema
```typescript
{
  status: 'safe' | 'help';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  userId?: string;
  synced?: boolean;
  _rev?: string; // for PouchDB compatibility
}
```

## Offline Testing

### Service Worker Debugging
- Chrome DevTools → Application → Service Workers
- Check `chrome://serviceworker-internals/` for detailed service worker status
- Use "Update on reload" for development testing

### Offline Testing Steps
1. Load the app online to cache resources and initialize PouchDB
2. Open DevTools → Network → Check "Offline"
3. Test emergency check-in - should save locally and show "offline" message
4. Uncheck "Offline" - PouchDB should automatically sync with backend
5. Check backend console for received status data
6. Visit `/history` page to see sync status

### PouchDB Sync Testing
1. Open DevTools → Application → Storage → IndexedDB
2. Look for `lifeline-local` database
3. Check sync status in bottom-right corner of the app
4. Use manual sync button on history page if needed

## Backend Testing

### Health Check
```bash
curl http://localhost:4000/health
```

### Authentication
```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Status Creation
```bash
curl -X POST http://localhost:4000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status":"safe","timestamp":1234567890,"latitude":36.8065,"longitude":10.1815}'
```

### PouchDB Sync Endpoint
```bash
curl http://localhost:4000/pouch/status
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### PouchDB Sync Issues
- Check browser console for sync errors
- Verify `NEXT_PUBLIC_COUCH_SYNC_URL` environment variable
- Ensure backend `/pouch/status` endpoint is accessible
- Check CORS configuration in backend

### Authentication Issues
- Verify JWT_SECRET is set in backend `.env`
- Check token expiration settings
- Ensure frontend is sending Authorization header

### Service Worker Issues
- Clear browser cache and reload
- Check service worker registration in DevTools
- Verify `next.config.ts` PWA configuration

## Migration Notes

This project was migrated from a single Next.js app to a robust three-tier architecture:

- **Added**: MongoDB persistence with Mongoose
- **Added**: JWT authentication system
- **Added**: PouchDB for automatic offline sync
- **Added**: CouchDB-compatible sync endpoints
- **Preserved**: All existing offline functionality and UI behavior
- **Enhanced**: Background sync with conflict resolution

## Tech Stack

### Frontend
- Next.js 15 (App Router, Turbopack)
- React 19.1.0, TypeScript, TailwindCSS 4
- PouchDB for offline sync
- next-pwa with runtimeCaching + Background Sync
- Leaflet (react-leaflet) with dynamic imports

### Backend
- NestJS 11.0.1 with TypeScript
- MongoDB with Mongoose ODM
- JWT authentication with Passport
- CouchDB-compatible sync endpoints
- Class-validator for DTO validation

### Database
- MongoDB (primary storage)
- PouchDB (client-side sync)
- IndexedDB (legacy compatibility)

## Next Steps

1. **Production Deployment**: Docker containers, environment management
2. **Real-time Features**: WebSocket integration for live updates
3. **Push Notifications**: Emergency alert system
4. **Advanced Sync**: Conflict resolution strategies
5. **Analytics**: User behavior and emergency response metrics
