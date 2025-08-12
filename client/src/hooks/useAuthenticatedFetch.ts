import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { useCallback } from 'react';

/**
 * Custom hook for authenticated API calls using App Bridge session tokens
 * Required for embedded app authentication
 */
export function useAuthenticatedFetch() {
  const app = useAppBridge();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        // Get fresh session token from App Bridge
        const token = await getSessionToken(app);
        
        if (!token) {
          throw new Error('No session token available');
        }

        // Add session token to headers
        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('Content-Type', 'application/json');

        // Make the request
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle billing redirect
        if (response.status === 402) {
          const data = await response.json();
          if (data.redirectUrl) {
            // Redirect to billing page
            window.location.href = data.redirectUrl;
            return null;
          }
        }

        // Handle token expiry
        if (response.status === 401) {
          // Token expired, get new token and retry
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
    },
    [app]
  );

  return authenticatedFetch;
}

/**
 * API client using authenticated fetch
 */
export function useApiClient() {
  const authenticatedFetch = useAuthenticatedFetch();

  const apiClient = {
    get: async (endpoint: string) => {
      const response = await authenticatedFetch(`/api${endpoint}`);
      if (!response) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },

    post: async (endpoint: string, data: any) => {
      const response = await authenticatedFetch(`/api${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },

    put: async (endpoint: string, data: any) => {
      const response = await authenticatedFetch(`/api${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },

    delete: async (endpoint: string) => {
      const response = await authenticatedFetch(`/api${endpoint}`, {
        method: 'DELETE',
      });
      if (!response) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },

    patch: async (endpoint: string, data: any) => {
      const response = await authenticatedFetch(`/api${endpoint}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!response) return null;
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },
  };

  return apiClient;
}