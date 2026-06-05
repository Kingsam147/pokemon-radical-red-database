import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let tokenGetter: (() => Promise<string>) | null = null;

export const registerTokenGetter = (getter: () => Promise<string>): void => {
  tokenGetter = getter;
};

apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
