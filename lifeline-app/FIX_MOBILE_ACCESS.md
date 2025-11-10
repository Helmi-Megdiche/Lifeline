# 🚨 Fix: Connection Reset Error

## ✅ What's Working:
- Server is listening on `0.0.0.0:3000` ✅
- Configuration is correct ✅

## 🔧 Fix Steps (Try in Order):

### Fix 1: Windows Firewall (MOST LIKELY ISSUE)

**Option A: PowerShell (Run as Administrator)**
```powershell
# Allow port 3000
netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000

# Also allow port 4004 for backend
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=4004
```

**Option B: Windows GUI**
1. Press `Win + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → Next
4. TCP, Specific local ports: `3000` → Next
5. Allow the connection → Next
6. Check all (Domain, Private, Public) → Next
7. Name: "Next.js Dev Server" → Finish
8. **Repeat for port 4004** (backend)

**Option C: Temporarily Disable Firewall (Quick Test)**
1. Windows Security → Firewall & network protection
2. Click your active network (Private network)
3. Turn OFF Windows Defender Firewall (temporarily)
4. Test from phone
5. Turn it back ON after testing

### Fix 2: Find Correct IP Address

When connected to mobile hotspot, run:
```powershell
ipconfig
```

**Look for:**
- Adapter name containing "Mobile" or your phone's name
- IP address starting with:
  - `192.168.43.` (Android)
  - `192.168.137.` (Android alternative)
  - `172.20.10.` (iPhone)
  - `192.168.136.` (your current)
  - `192.168.131.` (your current)

**Try each IP:**
- `http://192.168.136.1:3000`
- `http://192.168.131.1:3000`
- `http://192.168.43.1:3000` (if Android hotspot)

### Fix 3: Mobile Hotspot Settings

**On Your Phone:**

**Android:**
1. Settings → Network & internet → Hotspot & tethering
2. Tap "Wi‑Fi hotspot" → "Advanced"
3. **Turn OFF "AP Isolation"** or "Client Isolation"
4. This allows devices to communicate with each other

**iPhone:**
1. Settings → Personal Hotspot
2. Make sure "Allow Others to Join" is ON
3. Note the password

### Fix 4: Restart Everything

1. **Stop dev server** (Ctrl+C)
2. **Restart dev server:**
   ```bash
   cd lifeline-app
   npm run dev
   ```
3. **Wait for "Ready" message**
4. **Try from phone again**

### Fix 5: Test Connection from Laptop

**Test if server responds:**
```powershell
# Test localhost
Invoke-WebRequest http://localhost:3000

# Test with IP
Invoke-WebRequest http://192.168.136.1:3000
```

If localhost works but IP doesn't → Firewall issue
If both fail → Server not running correctly

### Fix 6: Use ngrok (Easiest Solution)

If nothing works, use ngrok to create a public tunnel:

1. **Download ngrok:** https://ngrok.com/download
2. **Extract and run:**
   ```bash
   ngrok http 3000
   ```
3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)
4. **Access from phone** using that URL
5. **No firewall/network issues!**

### Fix 7: Check Backend Connection

If backend is on port 4004, make sure it's also accessible:

**Backend should listen on 0.0.0.0:4004** (not just localhost)

Check backend configuration and restart it if needed.

## 🎯 Quick Checklist:

- [ ] Firewall rule added for port 3000
- [ ] Firewall rule added for port 4004 (if backend running)
- [ ] Dev server restarted after config change
- [ ] Correct IP address identified
- [ ] Mobile hotspot AP isolation disabled
- [ ] Both devices on same network (hotspot)

## 📱 Test on Phone:

Try these URLs in order:
1. `http://192.168.136.1:3000`
2. `http://192.168.131.1:3000`
3. `http://192.168.43.1:3000` (if Android)
4. `http://172.20.10.1:3000` (if iPhone)

If all fail → Use ngrok (Fix 6)

