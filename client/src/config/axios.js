import axios from 'axios';

// Set base URL for API calls
// In production (Render static site), use the full server URL
// In development, the proxy in package.json handles this
let API_BASE_URL = '';

if (process.env.NODE_ENV === 'production') {
  // If REACT_APP_API_URL is set, use it (for Render static site)
  if (process.env.REACT_APP_API_URL) {
    API_BASE_URL = process.env.REACT_APP_API_URL;
  } else {
    // Check if we're on Render static site (different domain from server)
    // If window.location.hostname includes 'releafnow-dashboard', we need to point to server
    if (typeof window !== 'undefined' && window.location.hostname.includes('releafnow-dashboard')) {
      API_BASE_URL = 'https://releafnow-server.onrender.com';
    }
    // Otherwise, we're served from Express server, use relative paths
  }
}

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token automatically
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
export { axiosInstance as axios };
