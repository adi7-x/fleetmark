import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth as apiAuth } from "../services/api";

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("fleetmark_user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser());
  // The access token lives in memory only (see services/api.js) and does
  // not survive a reload. On boot we try to recover a session from the
  // HttpOnly refresh cookie before anything that requires auth renders;
  // `ready` flips true once that one-time attempt has resolved either way.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const restored = await apiAuth.restoreSession();
      if (!alive) return;
      if (restored) {
        setUser(restored);
        localStorage.setItem("fleetmark_user", JSON.stringify(restored));
      } else {
        setUser(null);
        localStorage.removeItem("fleetmark_user");
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      setUser: (nextUser) => {
        setUser(nextUser);
        if (nextUser) localStorage.setItem("fleetmark_user", JSON.stringify(nextUser));
        else localStorage.removeItem("fleetmark_user");
      },
      logout: async () => {
        await apiAuth.logout();
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
