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
  async function queueVoiceAlert(
    audioBlob: Blob, 
    fields: { latitude?: number; longitude?: number; transcript?: string }
  ) {
    try {
      const queue = getQueue();
      const now = Date.now();
      
      // Check for duplicates: same location and timestamp within 5 seconds
      const isDuplicate = queue.some((item: any) => {
        if (item.type !== 'voice-alert') return false;
        
        const sameLocation = 
          fields.latitude !== undefined &&
          fields.longitude !== undefined &&
          item.fields?.latitude !== undefined &&
          item.fields?.longitude !== undefined &&
          Math.abs(item.fields.latitude - fields.latitude) < 0.0001 &&
          Math.abs(item.fields.longitude - fields.longitude) < 0.0001;
        
        const sameTime = item.timestamp && Math.abs(item.timestamp - now) < 5000;
        
        // Also check if transcript matches (if both have transcripts)
        const sameTranscript = 
          (!fields.transcript && !item.fields?.transcript) ||
          (fields.transcript && item.fields?.transcript && 
           fields.transcript.trim().toLowerCase() === item.fields.transcript.trim().toLowerCase());
        
        return sameLocation && sameTime && sameTranscript;
      });
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate voice alert detected, skipping queue');
        return Promise.resolve();
      }
      
      const attachmentB64 = await blobToBase64(audioBlob);
      const doc: any = {
        _id: `queue_${now}_${Math.random().toString(36).substring(2, 9)}`,
        type: 'voice-alert',
        endpoint: '/voice-alert/process',
        method: 'POST',
        fields: {
          latitude: fields.latitude,
          longitude: fields.longitude,
          transcript: fields.transcript || '', // Store transcript for later processing
        },
        _attachments: {
          audio: {
            content_type: audioBlob.type || 'audio/webm',
            data: attachmentB64,
          },
        },
        timestamp: now,
      };
      
      queue.push(doc);
      saveQueue(queue);
      console.log(`📦 Voice alert queued with transcript: "${fields.transcript || 'none'}"`);
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
    if (items.length === 0) return;
    
    const queue = getQueue();
    const processedIds: string[] = [];
    const processingSet = new Set<string>(); // Track items currently being processed to prevent duplicates
    
    for (const it of items as any[]) {
      try {
        // Skip if already being processed or already processed
        if (processingSet.has(it._id) || processedIds.includes(it._id)) {
          console.log('⏭️ Skipping duplicate processing for voice alert ID:', it._id);
          continue;
        }
        
        if (it.type === 'voice-alert') {
          processingSet.add(it._id); // Mark as processing
          
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
          
          // Send transcript if available (from client-side SpeechRecognition)
          if (it.fields?.transcript && it.fields.transcript.trim()) {
            form.append('transcript', it.fields.transcript.trim());
            console.log('📝 Sending queued transcript with voice alert:', it.fields.transcript.trim());
          } else {
            console.warn('⚠️ Queued voice alert has no transcript - will use server-side STT');
          }

          // Try to get token from localStorage (check both possible keys for compatibility)
          const token = typeof window !== 'undefined' 
            ? (localStorage.getItem('lifeline:token') || localStorage.getItem('accessToken'))
            : undefined;
          
          if (!token) {
            console.warn('⚠️ No token found for queued voice alert, skipping...');
            processingSet.delete(it._id);
            continue; // Skip this item if no token
          }

          // Use full backend URL instead of relative path
          const endpoint = it.endpoint || '/voice-alert/process';
          const apiUrl = getApiUrl(endpoint);
          console.log('📡 Processing queued voice alert (ID:', it._id, ') to:', apiUrl);
          
          const res = await fetch(apiUrl, {
            method: it.method || 'POST',
            headers: { 
              Authorization: `Bearer ${token}` 
            } as any,
            body: form,
          });
          
          if (!res.ok) {
            // Keep for retry if server rejected or offline
            console.warn('⚠️ Queued voice alert failed:', res.status, 'keeping for retry');
            processingSet.delete(it._id);
            continue;
          }
          
          // Success - mark as processed and remove immediately
          processedIds.push(it._id);
          processingSet.delete(it._id);
          
          // Remove from queue immediately to prevent reprocessing
          const remaining = queue.filter((item: any) => item._id !== it._id);
          saveQueue(remaining);
          
          console.log('✅ Queued voice alert processed and removed (ID:', it._id, ')');
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lifeline-queue-flushed'));
          }
        }
      } catch (error: any) {
        console.error('❌ Error processing queued voice alert (ID:', it._id, '):', error);
        processingSet.delete(it._id);
        // keep for retry
      }
    }
  }

  // Background retry: every 8s while online, attempt to flush if there are items
  // Use a flag to prevent concurrent processing
  let isProcessing = false;
  if (typeof window !== 'undefined') {
    let retryTimer: number | undefined;
    const tick = async () => {
      if (!navigator.onLine || isProcessing) return;
      const items = await getAll();
      if (items.length > 0) {
        isProcessing = true;
        try {
          await processQueue();
        } finally {
          isProcessing = false;
        }
      }
    };
    const start = () => {
      if (retryTimer) return;
      retryTimer = window.setInterval(tick, 8000) as unknown as number;
    };
    const stop = () => {
      if (retryTimer) window.clearInterval(retryTimer);
      retryTimer = undefined;
    };
    window.addEventListener('online', () => {
      start();
      // Process immediately when coming online
      if (!isProcessing) {
        isProcessing = true;
        tick().finally(() => { isProcessing = false; });
      }
    });
    window.addEventListener('offline', stop);
    document.addEventListener('visibilitychange', () => { 
      if (document.visibilityState === 'visible' && !isProcessing) {
        isProcessing = true;
        tick().finally(() => { isProcessing = false; });
      }
    });
    // kick once
    if (!isProcessing) {
      isProcessing = true;
      tick().finally(() => { isProcessing = false; });
    }
  }

  async function forceFlushQueue() { return processQueue(); }

  return { queueVoiceAlert, getAll, processQueue, forceFlushQueue };
}


