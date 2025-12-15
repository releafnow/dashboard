// Helper function to get the API base URL for images and other assets
export const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the server URL
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // Auto-detect if on Render static site
    if (typeof window !== 'undefined' && window.location.hostname.includes('releafnow-dashboard')) {
      return 'https://releafnow-server.onrender.com';
    }
    // If served from Express server, use relative paths
    return '';
  }
  // In development, use localhost
  return 'http://localhost:5000';
};

// Helper function to get upload URL
export const getUploadUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return `/uploads/${path}`; // Relative path
  }
  return `${baseUrl}/uploads/${path}`;
};
