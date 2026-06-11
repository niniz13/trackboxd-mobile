import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiJson, setToken, clearToken, getToken } from '../constants/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Trackboxd',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff2d95',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiJson('/api/mobile/user/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch { /* ignore — notifications are non-critical */ }
}

export interface AuthUser {
  id: string; name: string; handle: string;
  email: string; color: string; image: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signIn:    (email: string, password: string) => Promise<void>;
  register:  (name: string, email: string, password: string) => Promise<void>;
  signOut:   () => Promise<void>;
  refresh:   () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  signIn: async () => {}, register: async () => {}, signOut: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }
      const me = await apiJson<AuthUser>('/api/mobile/auth/me');
      setUser(me);
      registerPushToken();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = async (email: string, password: string) => {
    const { token, user: u } = await apiJson<{ token: string; user: AuthUser }>(
      '/api/mobile/auth/signin',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    await setToken(token);
    setUser(u);
    registerPushToken();
  };

  const register = async (name: string, email: string, password: string) => {
    const { token, user: u } = await apiJson<{ token: string; user: AuthUser }>(
      '/api/mobile/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    );
    await setToken(token);
    setUser(u);
    registerPushToken();
  };

  const signOut = async () => {
    await apiJson('/api/mobile/user/push-token', { method: 'DELETE' }).catch(() => {});
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
