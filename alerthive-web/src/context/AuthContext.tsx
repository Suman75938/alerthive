import { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { apiPost, tokenStore } from '../lib/api';

// ─── Seed users (local fallback when API is offline) ─────────────────────────
export const SEED_USERS: (User & { password: string })[] = [
  { id: 'u-001', name: 'Suman Chakraborty', email: 'admin@alerthive.com', password: 'REDACTED_SEED_PASSWORD', role: 'admin', team: 'Platform Team', phone: '+1-555-0199', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'u-002', name: 'Mike Johnson', email: 'mike@alerthive.com',  password: 'dev123',   role: 'developer', team: 'Platform Team',        phone: '+1-555-0102', createdAt: '2025-01-05T00:00:00Z' },
  { id: 'u-003', name: 'Alex Rivera',  email: 'alex@alerthive.com',  password: 'dev123',   role: 'developer', team: 'Infrastructure Team',  phone: '+1-555-0103', createdAt: '2025-01-10T00:00:00Z' },
  { id: 'u-004', name: 'Emily Watson', email: 'emily@alerthive.com', password: 'dev123',   role: 'developer', team: 'Security Team',        phone: '+1-555-0104', createdAt: '2025-01-12T00:00:00Z' },
  { id: 'u-005', name: 'Jordan Lee',   email: 'jordan@example.com',  password: 'user123',  role: 'end_user',  createdAt: '2025-02-01T00:00:00Z' },
  { id: 'u-006', name: 'Casey Morgan', email: 'casey@example.com',   password: 'user123',  role: 'end_user',  createdAt: '2025-03-01T00:00:00Z' },
];

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isDeveloper: boolean;
  isEndUser: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('ah_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Local mutable user store – used as fallback when API is unreachable
  const [localUsers, setLocalUsers] = useState<(User & { password: string })[]>(SEED_USERS);

  const persistUser = (u: User) => {
    setUser(u);
    sessionStorage.setItem('ah_user', JSON.stringify(u));
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Try real API first
    try {
      const res = await apiPost<{ accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email, password, orgSlug: 'fedex-ito' },
      );
      if (res.success && res.data) {
        tokenStore.set(res.data.accessToken, res.data.refreshToken);
        // Fetch profile
        const me = await apiPost<User>('/auth/me');
        if (me.success && me.data) {
          persistUser(me.data);
          return { success: true };
        }
      }
    } catch {
      // API unreachable – fall back to local seed
    }

    // Local fallback
    const found = localUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) return { success: false, error: 'Invalid email or password.' };
    const { password: _pw, ...userData } = found;
    persistUser(userData);
    return { success: true };
  };

  const signup = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    // Try real API first
    try {
      const res = await apiPost<{ accessToken: string; refreshToken: string }>(
        '/auth/signup',
        { email, password, name, orgSlug: 'fedex-ito' },
      );
      if (res.success && res.data) {
        tokenStore.set(res.data.accessToken, res.data.refreshToken);
        const me = await apiPost<User>('/auth/me');
        if (me.success && me.data) {
          persistUser(me.data);
          return { success: true };
        }
      }
    } catch {
      // API unreachable – fall back to local
    }

    // Local fallback
    if (localUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const newUser: User & { password: string } = {
      id: `u-${Date.now()}`, name, email, password, role, createdAt: new Date().toISOString(),
    };
    setLocalUsers((prev) => [...prev, newUser]);
    const { password: _pw, ...userData } = newUser;
    persistUser(userData);
    return { success: true };
  };

  const logout = () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) apiPost('/auth/logout', { refreshToken: refresh }).catch(() => {});
    tokenStore.clear();
    setUser(null);
    sessionStorage.removeItem('ah_user');
  };

  const refreshUser = async () => {
    try {
      const me = await apiPost<User>('/auth/me');
      if (me.success && me.data) persistUser(me.data);
    } catch {
      // API unreachable – keep existing user state
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        refreshUser,
        isAdmin: user?.role === 'admin',
        isDeveloper: user?.role === 'developer',
        isEndUser: user?.role === 'end_user',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
