export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://eab3e2e2d3a4.ngrok-free.app';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
};

// Chat endpoint configuration
export const CHAT_ENDPOINT = {
  path: '/assistant',
};
