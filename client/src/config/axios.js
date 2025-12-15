import axios from 'axios';

// Set base URL for API calls
// In production (Render), use the full server URL
// In development, the proxy in package.json handles this
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;


