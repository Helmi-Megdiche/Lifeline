// Configuration for API endpoints
export const API_CONFIG = {
  BASE_URL: 'http://localhost:4004', // Hardcode for now to avoid env issues
  STATUS_ENDPOINT: '/status',
  HEALTH_ENDPOINT: '/health',
  AUTH_ENDPOINT: '/auth',
  POUCH_ENDPOINT: '/pouch/status',
} as const;

// Debug logging
console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
console.log('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`;
