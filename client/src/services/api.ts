// Development API client - no App Bridge needed for local testing

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Simple fetch wrapper for development
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  // In development, add mock session
  if (process.env.NODE_ENV === 'development') {
    headers.set('X-Shop-Domain', 'test-shop.myshopify.com');
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
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

  return response;
};

// API client object
const api = {
  get: async (endpoint: string) => {
    try {
      const response = await fetchWithAuth(endpoint);
      if (!response) return { data: null };
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API GET error:', error);
      return { data: null, error };
    }
  },

  post: async (endpoint: string, data: any) => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response) return { data: null };
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API POST error:', error);
      return { data: null, error };
    }
  },

  put: async (endpoint: string, data: any) => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response) return { data: null };
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API PUT error:', error);
      return { data: null, error };
    }
  },

  delete: async (endpoint: string) => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE',
      });
      if (!response) return { data: null };
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API DELETE error:', error);
      return { data: null, error };
    }
  },

  patch: async (endpoint: string, data: any) => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!response) return { data: null };
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API PATCH error:', error);
      return { data: null, error };
    }
  },
};

export default api;