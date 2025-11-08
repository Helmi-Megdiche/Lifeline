const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:4004';
const PROCESS_URI = `${BASE}/voice-alert/process`;
const TEST_URI = `${BASE}/voice-alert/testNotify`;
const LOGIN_URI = `${BASE}/auth/login`;
const REGISTER_URI = `${BASE}/auth/register`;
const FILE = path.join(__dirname, 'help_me.webm');

// Get JWT token - from env or auto-login (with auto-register fallback)
async function getToken() {
  if (process.env.TEST_JWT) return process.env.TEST_JWT;
  
  const username = process.env.TEST_USERNAME || 'helmi123';
  const password = process.env.TEST_PASSWORD || 'test123';
  
  // Try login first
  try {
    const res = await fetch(LOGIN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`✓ Auto-logged in as ${username}`);
      return data.accessToken;
    }
  } catch (e) {
    // Continue to registration attempt
  }
  
  // If login failed, try to register
  try {
    console.log(`⚠ Login failed for ${username}, attempting auto-registration...`);
    const regRes = await fetch(REGISTER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email: `${username}@test.com` }),
    });
    
    if (regRes.ok) {
      console.log(`✓ Registered new test user: ${username}`);
      // Now login with the new user
      const loginRes = await fetch(LOGIN_URI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        console.log(`✓ Auto-logged in as ${username}`);
        return data.accessToken;
      }
    } else {
      const errorText = await regRes.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}
      
      // If registration fails (especially 500), user might already exist - retry login
      const shouldRetryLogin = regRes.status === 409 || regRes.status === 500 || 
        (errorJson?.message && (errorJson.message.includes('duplicate') || errorJson.message.includes('already exists') || errorJson.message.includes('E11000'))) ||
        errorText.includes('duplicate') || errorText.includes('E11000');
      
      if (shouldRetryLogin) {
        console.log(`ℹ Registration failed (user may already exist), retrying login...`);
        const retryLogin = await fetch(LOGIN_URI, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (retryLogin.ok) {
          const data = await retryLogin.json();
          console.log(`✓ Logged in as existing user: ${username}`);
          return data.accessToken;
        } else {
          const loginError = await retryLogin.text();
          console.log(`⚠ Login failed for ${username}. Registration error: ${errorText.substring(0, 100)}`);
          console.log(`   Login error: ${loginError.substring(0, 100)}`);
          console.log(`   Try setting TEST_PASSWORD with the correct password, or use TEST_JWT directly.`);
        }
      } else {
        console.log(`⚠ Registration failed: ${errorText.substring(0, 150)}`);
      }
    }
  } catch (e) {
    console.log(`⚠ Could not auto-register/login: ${e.message}`);
  }
  
  return null;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendWithFile(iter, token) {
  const form = new FormData();
  // Vary coordinates significantly to avoid deduplication
  const baseLat = 36.90; const baseLon = 10.30;
  const lat = baseLat + (iter * 0.03) + (Math.random() * 0.01);
  const lon = baseLon + (iter * 0.03) + (Math.random() * 0.01);
  form.append('audio', fs.createReadStream(FILE));
  form.append('latitude', String(Math.round(lat * 10000) / 10000));
  form.append('longitude', String(Math.round(lon * 10000) / 10000));
  const headers = { ...form.getHeaders() };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(PROCESS_URI, { method: 'POST', body: form, headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (res.status === 200 || res.status === 201) {
      console.log(`[${iter}] ✓ Created alert: ${json.saved?._id || 'N/A'} @ ${lat.toFixed(4)},${lon.toFixed(4)}`);
    } else if (res.status === 409) {
      console.log(`[${iter}] ⚠ Dedupe conflict @ ${lat.toFixed(4)},${lon.toFixed(4)}`);
    } else {
      console.log(`[${iter}] ✗ Status ${res.status}: ${text.substring(0, 100)}`);
    }
  } catch {
    console.log(`[${iter}] Status ${res.status}:`, text.substring(0, 100));
  }
}

async function sendTestNotify(iter, token) {
  // Vary coordinates significantly to avoid deduplication (need >0.01 difference)
  const baseLat = 36.90; const baseLon = 10.30;
  const lat = baseLat + (iter * 0.03) + (Math.random() * 0.01);
  const lon = baseLon + (iter * 0.03) + (Math.random() * 0.01);
  const payload = { latitude: Math.round(lat * 10000) / 10000, longitude: Math.round(lon * 10000) / 10000 };
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(TEST_URI, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (res.status === 200 || res.status === 201) {
      console.log(`[${iter}] ✓ Created alert: ${json.res?.saved?._id || json.saved?._id || 'N/A'} @ ${payload.latitude},${payload.longitude}`);
    } else if (res.status === 409) {
      console.log(`[${iter}] ⚠ Dedupe conflict (similar alert exists) @ ${payload.latitude},${payload.longitude}`);
    } else {
      console.log(`[${iter}] ✗ Status ${res.status}: ${text.substring(0, 100)}`);
    }
  } catch {
    console.log(`[${iter}] Status ${res.status}:`, text.substring(0, 100));
  }
}

(async () => {
  const useFile = fs.existsSync(FILE);
  console.log('Auto tester start →', useFile ? 'uploading help_me.webm' : 'using /voice-alert/testNotify');
  
  const token = await getToken();
  if (!token) {
    console.error('❌ No JWT token available. Set TEST_JWT or TEST_USERNAME/TEST_PASSWORD env vars.');
    process.exit(1);
  }
  
  for (let i = 1; i <= 5; i++) {
    try {
      if (useFile) await sendWithFile(i, token); else await sendTestNotify(i, token);
    } catch (e) {
      console.error(`[${i}] error:`, e?.message || e);
    }
    if (i < 5) await sleep(15000);
  }
  console.log('Auto tester done.');
})();


