# 📱 Accessing App from Phone (Mobile Hotspot Setup)

## ✅ Fixed Configuration

I've updated the dev server to accept connections from your phone. Here's what changed:

### Changes Made:
- ✅ Dev server now listens on `0.0.0.0` (all network interfaces)
- ✅ This allows your phone to connect when laptop is on mobile hotspot

## 🔧 Step-by-Step Instructions

### Step 1: Restart the Dev Server

**Stop the current dev server** (if running) and restart it:

```bash
cd lifeline-app
npm run dev
```

You should see:
```
- Local:        http://localhost:3000
- Network:     http://0.0.0.0:3000
```

### Step 2: Find Your Laptop's IP on Mobile Hotspot

When your laptop is connected to your phone's hotspot, run:

```powershell
ipconfig | findstr /i "IPv4"
```

**Look for IPs that match mobile hotspot patterns:**
- `192.168.43.x` (Android hotspot - most common)
- `192.168.137.x` (Android hotspot alternative)
- `172.20.10.x` (iPhone hotspot)

**Your current IPs:**
- `192.168.136.1` ← Might be mobile hotspot
- `192.168.131.1` ← Might be mobile hotspot
- `192.168.11.100` ← Regular WiFi
- `192.168.12.100` ← Regular WiFi
- `10.132.177.197` ← VPN or other network

### Step 3: Allow Firewall (Run as Administrator)

Open PowerShell **as Administrator** and run:

```powershell
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000
```

**Or manually:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. TCP, Specific local ports: `3000` → Next
6. Allow the connection → Next
7. Check all profiles → Next
8. Name: "Next.js Dev Server" → Finish

### Step 4: Access from Your Phone

1. **Make sure your laptop is connected to your phone's hotspot**
2. **On your phone**, open Chrome/Safari browser
3. **Type in address bar:**
   ```
   http://192.168.136.1:3000
   ```
   (Try `192.168.131.1:3000` if that doesn't work)

4. The app should load!

### Step 5: If Still Not Working

**Check 1: Is dev server running?**
- Look for "Ready" message in terminal
- Should show "Local: http://localhost:3000"

**Check 2: Test from laptop browser**
- Open `http://localhost:3000` on your laptop
- If it works, the server is running correctly

**Check 3: Try different IPs**
- Try each IP address from `ipconfig` output
- One of them should work

**Check 4: Disable Firewall Temporarily**
- Go to Windows Security → Firewall
- Temporarily turn off firewall
- Try accessing from phone again
- If it works, firewall was blocking it

**Check 5: Check Mobile Hotspot Settings**
- On your phone, check hotspot settings
- Make sure "AP Isolation" or "Client Isolation" is **OFF**
- This allows devices to communicate with each other

## 🎯 Quick Test

1. **On laptop:** Run `npm run dev`
2. **On laptop browser:** Open `http://localhost:3000` (should work)
3. **On phone:** Open `http://192.168.136.1:3000` (try this first)
4. **If connection reset:** Try firewall fix above

## 📝 Notes

- The dev server must be running for your phone to connect
- Both devices must be on the same network (mobile hotspot)
- Windows Firewall often blocks incoming connections by default
- The IP address changes when you reconnect to hotspot

