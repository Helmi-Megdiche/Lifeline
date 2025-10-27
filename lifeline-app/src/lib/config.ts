// Configuration for API endpoints
import { detectBackendUrl, getBackendUrl } from './getBackendUrl';

// We'll initialize BASE_URL dynamically
let API_CONFIG_BASE_URL = 'http://localhost:4004'; // Default fallback

// Initialize the BASE_URL asynchronously
if (typeof window !== 'undefined') {
  getBackendUrl().then(url => {
    API_CONFIG_BASE_URL = url;
    console.log('Auto-detected backend URL:', API_CONFIG_BASE_URL);
  });
}

export const API_CONFIG = {
  get BASE_URL() {
    // Return environment variable if set, otherwise use auto-detected or fallback
    return process.env.NEXT_PUBLIC_API_URL || API_CONFIG_BASE_URL;
  },
  STATUS_ENDPOINT: '/status',
  HEALTH_ENDPOINT: '/health',
  AUTH_ENDPOINT: '/auth',
  POUCH_ENDPOINT: '/pouch/status',
} as const;

// Debug logging
console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
console.log('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`;

// Export auto-detection functions for use in contexts
export { detectBackendUrl, getBackendUrl, resetBackendUrlCache } from './getBackendUrl';
