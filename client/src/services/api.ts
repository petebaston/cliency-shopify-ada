// This file is deprecated - use useApiClient hook instead
// Keeping for backward compatibility during migration

import { getSessionToken } from '@shopify/app-bridge/utilities';
import { createApp } from '@shopify/app-bridge';

// Get App Bridge instance
const getAppBridge = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get('host') || '';
  
  return createApp({
    apiKey: process.env.REACT_APP_SHOPIFY_API_KEY || '',
    host: host,
  });
};

// Authenticated fetch function
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const app = getAppBridge();
    const token = await getSessionToken(app);
    
    if (!token) {
      throw new Error('No session token available');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle billing redirect
    if (response.status === 402) {
      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return null;
      }
    }

    // Handle token expiry
    if (response.status === 401) {
      const newToken = await getSessionToken(app);
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};

// API client object for backward compatibility
const api = {
  get: async (endpoint: string) => {
    const response = await authenticatedFetch(`/api${endpoint}`);
    if (!response) return { data: null };
    const data = await response.json();
    return { data };
  },

  post: async (endpoint: string, data: any) => {
    const response = await authenticatedFetch(`/api${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response) return { data: null };
    const responseData = await response.json();
    return { data: responseData };
  },

  put: async (endpoint: string, data: any) => {
    const response = await authenticatedFetch(`/api${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response) return { data: null };
    const responseData = await response.json();
    return { data: responseData };
  },

  delete: async (endpoint: string) => {
    const response = await authenticatedFetch(`/api${endpoint}`, {
      method: 'DELETE',
    });
    if (!response) return { data: null };
    const responseData = await response.json();
    return { data: responseData };
  },

  patch: async (endpoint: string, data: any) => {
    const response = await authenticatedFetch(`/api${endpoint}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response) return { data: null };
    const responseData = await response.json();
    return { data: responseData };
  },
};

export default api;