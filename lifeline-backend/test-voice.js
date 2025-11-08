// test-voice.js
import fs from 'node:fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const URI = 'http://localhost:4004/voice-alert/process';
const FILE = './help_me.webm';

async function sendOnce() {
  const form = new FormData();
  form.append('audio', fs.createReadStream(FILE));
  form.append('userId', 'helmi123');

  const res = await fetch(URI, { method: 'POST', body: form, headers: form.getHeaders() });
  const data = await res.json().catch(() => ({}));
  console.log('status', res.status, 'intent', data?.ai?.intent, 'category', data?.ai?.category, 'conf', data?.ai?.confidence);
}

(async () => {
  for (let i = 1; i <= 5; i++) {
    try { await sendOnce(); } catch (e) { console.error('run', i, 'error', e?.message || e); }
    await new Promise(r => setTimeout(r, 20000));
  }
})();