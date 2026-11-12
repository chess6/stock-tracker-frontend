import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { useToast } from './ToastContext';

/**
 * Owner sign-in state from GET /api/auth/session.
 *
 * When the backend runs without APP_PASSWORD_HASH (or predates auth), everything is
 * writable and `authRequired` is false. In protected mode guests browse read-only and
 * writes return 401 `{ authRequired: true }`; one interceptor turns those into a toast.
 */
export const AUTH_REQUIRED_EVENT = 'auth-required';

const OPEN_SESSION = { authRequired: false, authenticated: true, role: 'owner' };
const AuthContext = createContext(null);

let interceptorId = null;
function installAuthInterceptor() {
  if (interceptorId !== null) return;
  interceptorId = axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const { response, config } = error || {};
      if (response?.status === 401 && response.data?.authRequired && !String(config?.url || '').includes('/auth/')) {
        window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
      }
      return Promise.reject(error);
    },
  );
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [session, setSession] = useState(OPEN_SESSION);
  const [status, setStatus] = useState('loading');
  const lastPromptRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const { res, data } = await requestJson(API_ENDPOINTS.AUTH_SESSION);
      // 404: backend without the auth endpoints, i.e. single-user local mode.
      setSession(res.ok && data ? data : OPEN_SESSION);
    } catch {
      setSession(OPEN_SESSION);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    installAuthInterceptor();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuthRequired = () => {
      const now = Date.now();
      if (now - lastPromptRef.current < 4000) return; // one toast per burst of failed calls
      lastPromptRef.current = now;
      showToast('This is a read-only demo. Sign in as the owner to make changes.', 'warning', 6000);
      refresh(); // the session may have expired
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, [refresh, showToast]);

  const login = useCallback(async (password) => {
    const { res, data } = await requestJson(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      throw new Error(data?.error || 'Sign-in failed. Try again.');
    }
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { data } = await requestJson(API_ENDPOINTS.AUTH_LOGOUT, { method: 'POST' });
    setSession(data || { authRequired: true, authenticated: false, role: 'guest' });
  }, []);

  const value = useMemo(() => ({
    ...session,
    readOnly: session.authRequired && !session.authenticated,
    status,
    login,
    logout,
    refresh,
  }), [session, status, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
