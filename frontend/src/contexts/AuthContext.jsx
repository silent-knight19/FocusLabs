/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

// Debug logging - only enabled in development
const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Check for pending redirect result FIRST, keeping loading true until resolved
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled) return;
        if (result?.user) {
          setUser(result.user);
        }
        setLoading(false);
      })
      .catch((err) => {
        logError('[Auth] Error from redirect login result:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    // Fallback: listen for auth state changes (catches normal page loads)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!cancelled) {
        setUser(user);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    // Redirect-based sign-in is reliable across all browsers (no popup blockers).
    // The page navigates to Google, then returns with the auth result.
    await signInWithRedirect(auth, googleProvider);
    // No setLoading(false) here — the page redirects away before it runs.
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      logError('[Auth] Error signing out:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      setUser(result.user);
      return result.user;
    } catch (err) {
      logError('[Auth] Error signing up:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      return result.user;
    } catch (err) {
      logError('[Auth] Error signing in:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    signInWithGoogle,
    signUp,
    signIn,
    signOut
  }), [user, loading, error, signInWithGoogle, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
