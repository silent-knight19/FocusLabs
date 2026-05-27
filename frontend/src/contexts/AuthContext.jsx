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
    // Check for errors from redirect flow
    getRedirectResult(auth).catch((err) => {
      logError('[Auth] Error from redirect result:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithRedirect(auth, googleProvider);
      // The page will redirect away. State will be handled on reload by getRedirectResult and onAuthStateChanged.
    } catch (err) {
      logError('[Auth] Error signing in with Google:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
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
