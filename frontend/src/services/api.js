/**
 * api.js - Axios Instance Configuration
 * =======================================
 * Central API configuration following PROJECT_STRUCTURE.md
 */

import axios from 'axios';
import { toast } from 'react-toastify';

// API Base URL - Auto-detect for LAN access
const getBaseURL = () => {
  // If REACT_APP_API_URL is set and we're accessing via localhost, use it
  if (process.env.REACT_APP_API_URL && window.location.hostname === 'localhost') {
    return process.env.REACT_APP_API_URL;
  }

  // For LAN access, use the current hostname
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '5000';

  return `${protocol}//${hostname}:${port}/api`;
};

const BASE_URL = getBaseURL();

/**
 * Create Axios Instance
 */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true, // ✅ SECURITY FIX: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * ✅ SECURITY FIX: Token is now sent automatically via httpOnly cookies
 */
api.interceptors.request.use(
  (config) => {
    // ✅ Token is now sent automatically via httpOnly cookies
    // No need to manually add Authorization header
    // Cookies are sent automatically with withCredentials: true

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle global errors and token refresh
 */
api.interceptors.response.use(
  (response) => {
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // ✅ SECURITY FIX: Try to refresh token (token is in cookie, handled by backend)
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          withCredentials: true // Send cookie to refresh endpoint
        });

        // Retry original request (new token is in cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        // No need to clear localStorage, cookies are httpOnly
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const { status, data } = error.response;
      let message = data?.message || 'An error occurred';

      switch (status) {
        case 400:
          message = data?.message || 'Invalid request';
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = data?.message || 'Resource not found';
          break;
        case 409:
          message = data?.message || 'Conflict error';
          break;
        case 422:
          if (data?.errors) {
            message = data.errors.map(e => e.message).join(', ');
          } else {
            message = 'Validation error';
          }
          break;
        case 429:
          message = 'Too many requests. Please try again later';
          break;
        case 500:
          message = 'Server error. Please try again later';
          break;
        default:
          break;
      }

      // Show error toast
      toast.error(message);
    } else if (error.request) {
      // No response received
      toast.error('Network error. Please check your connection');
    } else {
      // Request setup error
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

/**
 * Export configured axios instance
 */
export default api;

/**
 * Helper function to handle file uploads
 */
export const uploadFile = (url, formData, onProgress) => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

/**
 * Helper function to handle file downloads
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    throw error;
  }
};
