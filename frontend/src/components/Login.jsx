import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './styles/Login.css';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

export function Login() {
  const { signInWithGoogle, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      logError('[Login] Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-brand">
          <img
            src="/logo.png"
            alt="FocusLabs"
            className="login-logo-img"
          />
        </div>

        <div className="login-card">
          <div className="login-card-content">
            <header className="login-card-header">
              <h1 className="login-heading">Welcome back</h1>
              <p className="login-lead">
                Sign in to continue building better habits
              </p>
            </header>

            <div className="login-actions">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-google"
              >
                {loading ? (
                  <span className="btn-content">
                    <span className="spinner" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="btn-content">
                    <svg className="google-logo" viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </span>
                )}
              </button>
            </div>

            {(error || authError) && (
              <div className="login-alert" role="alert">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error || authError}</span>
              </div>
            )}

            <footer className="login-card-footer">
              <p className="security-note">
                <svg className="lock-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secure sign-in with Firebase
              </p>
            </footer>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">◐</span>
            <span className="feature-label">Track habits</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">◑</span>
            <span className="feature-label">Time analytics</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">◒</span>
            <span className="feature-label">Build streaks</span>
          </div>
        </div>
      </div>

      <div className="login-backdrop" aria-hidden="true">
        <div className="backdrop-gradient" />
        <div className="backdrop-noise" />
      </div>
    </div>
  );
}

