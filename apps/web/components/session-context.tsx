"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  changePin,
  createOrVerifyUserWithPin,
  fetchUserProfile,
} from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

type SessionUser = {
  id: string;
  displayName: string;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (displayName: string, pin: string) => Promise<void>;
  logout: () => void;
  profile: UserProfile | null;
  updatePin: (newPin: string) => Promise<void>;
};

const SESSION_KEY = "wishlist-session";
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionUser;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const profileDoc = await fetchUserProfile(user.id);
      setProfile(profileDoc);
    };
    void loadProfile();
  }, [user]);

  const login = async (displayName: string, pin: string) => {
    const profileDoc = await createOrVerifyUserWithPin(displayName, pin);
    const sessionUser: SessionUser = {
      id: profileDoc.id,
      displayName: profileDoc.displayName ?? displayName,
    };
    setUser(sessionUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    }
    setProfile(profileDoc);
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const updatePin = async (newPin: string) => {
    if (!user) return;
    await changePin(user.id, newPin);
  };

  return (
    <SessionContext.Provider
      value={{ user, loading, login, logout, profile, updatePin }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
};
