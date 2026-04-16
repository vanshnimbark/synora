import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

import type { User } from "@/types/database";

interface AuthState {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  clearAuth: () => void;
}

const parseBool = (value: unknown): boolean => value === true || value === "true";

const normalizeUser = (user: User): User => {
  const raw = user as unknown as Record<string, unknown>;
  return {
    ...user,
    is_approved: parseBool(raw.is_approved),
    is_founder_approved: parseBool(raw.is_founder_approved),
    is_banned: parseBool(raw.is_banned),
    is_invisible: parseBool(raw.is_invisible),
    is_paid: parseBool(raw.is_paid),
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setUser: (user) => set({ user: user ? normalizeUser(user) : null }),
  setSession: (session) => set({ session }),
  clearAuth: () => set({ user: null, session: null }),
}));
