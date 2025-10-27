// Utility to dynamically detect backend URL
// This will try multiple strategies to find the backend automatically

export const getBackendUrl = async (): Promise<string> => {
  // First, check if there's an environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Get the current hostname
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // If we're on localhost or 127.0.0.1, use localhost
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return `http://localhost:4004`;
    }
    
    // If we're on a specific IP, try to connect to the same IP on the backend port
    // This works for scenarios like: accessing via 10.96.15.197:3000 -> backend at 10.96.15.197:4004
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      // Try the same IP with backend port
      try {
        const backendUrl = `http://${currentHost}:4004`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        if (response.ok) {
          return backendUrl;
        }
      } catch (error) {
        // Try localhost as fallback
      }
    }
  }

  // Default fallback (will be overridden by successful detection)
  return 'http://localhost:4004';
};

// Cache the detected URL
let cachedBackendUrl: string | null = null;

export const detectBackendUrl = async (): Promise<string> => {
  if (cachedBackendUrl) {
    return cachedBackendUrl;
  }

  const url = await getBackendUrl();
  cachedBackendUrl = url;
  return url;
};

// Reset cache (useful for re-detection after network changes)
export const resetBackendUrlCache = () => {
  cachedBackendUrl = null;
};

