import { getApiUrl } from './config';

const QUEUE_KEY = 'lifeline-voice-queue';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getQueue(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to read queue from localStorage:', error);
    return [];
  }
}

function saveQueue(queue: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    // If quota exceeded, try to clear old items - silently handle
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Silently handle quota exceeded - don't log
      // Keep only the 5 most recent items
      const queue = getQueue();
      const recent = queue.slice(-5);
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(recent));
      } catch (e) {
        // Silently ignore if still fails
      }
    } else {
      // Only log non-quota errors
      console.error('Failed to save queue to localStorage:', error);
    }
  }
}

export default function usePouchQueue() {
  async function queueVoiceAlert(audioBlob: Blob, fields: { latitude?: number; longitude?: number }) {
    try {
      const attachmentB64 = await blobToBase64(audioBlob);
      const doc: any = {
        _id: `queue_${Date.now()}`,
        type: 'voice-alert',
        endpoint: '/voice-alert/process',
        method: 'POST',
        fields: {
          latitude: fields.latitude,
          longitude: fields.longitude,
        },
        _attachments: {
          audio: {
            content_type: audioBlob.type || 'audio/webm',
            data: attachmentB64,
          },
        },
      };
      
      const queue = getQueue();
      queue.push(doc);
      saveQueue(queue);
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to queue voice alert:', error);
      throw error;
    }
  }

  async function getAll() {
    return getQueue();
  }

  async function processQueue() {
    const items = await getAll();
    const queue = getQueue();
    const processedIds: string[] = [];
    
    for (const it of items as any[]) {
      try {
        if (it.type === 'voice-alert') {
          const form = new FormData();
          const audioAtt = it._attachments?.audio;
          if (audioAtt?.data) {
            // Rebuild Blob from base64
            const byteChars = atob(audioAtt.data);
            const byteNums = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
            const byteArray = new Uint8Array(byteNums);
            const blob = new Blob([byteArray], { type: audioAtt.content_type || 'audio/webm' });
            const file = new File([blob], 'queued.webm', { type: blob.type });
            form.append('audio', file);
          }
          if (it.fields?.latitude) form.append('latitude', String(it.fields.latitude));
          if (it.fields?.longitude) form.append('longitude', String(it.fields.longitude));

          // Try to get token from localStorage (check both possible keys for compatibility)
          const token = typeof window !== 'undefined' 
            ? (localStorage.getItem('lifeline:token') || localStorage.getItem('accessToken'))
            : undefined;
          
          if (!token) {
            console.warn('⚠️ No token found for queued voice alert, skipping...');
            continue; // Skip this item if no token
          }

          // Use full backend URL instead of relative path
          const endpoint = it.endpoint || '/voice-alert/process';
          const apiUrl = getApiUrl(endpoint);
          console.log('📡 Processing queued voice alert to:', apiUrl);
          
          const res = await fetch(apiUrl, {
            method: it.method || 'POST',
            headers: { 
              Authorization: `Bearer ${token}` 
            } as any,
            body: form,
          });
          if (!res.ok) {
            // Keep for retry if server rejected or offline
            continue;
          }
          
          // Mark as processed
          processedIds.push(it._id);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lifeline-queue-flushed'));
          }
        }
      } catch {
        // keep for retry
      }
    }
    
    // Remove processed items from queue
    if (processedIds.length > 0) {
      const remaining = queue.filter((item: any) => !processedIds.includes(item._id));
      saveQueue(remaining);
    }
  }

  // Background retry: every 8s while online, attempt to flush if there are items
  if (typeof window !== 'undefined') {
    let retryTimer: number | undefined;
    const tick = async () => {
      if (!navigator.onLine) return;
      const items = await getAll();
      if (items.length > 0) await processQueue();
    };
    const start = () => {
      if (retryTimer) return;
      retryTimer = window.setInterval(tick, 8000) as unknown as number;
    };
    const stop = () => {
      if (retryTimer) window.clearInterval(retryTimer);
      retryTimer = undefined;
    };
    window.addEventListener('online', start);
    window.addEventListener('offline', stop);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
    // kick once
    tick();
  }

  async function forceFlushQueue() { return processQueue(); }

  return { queueVoiceAlert, getAll, processQueue, forceFlushQueue };
}


