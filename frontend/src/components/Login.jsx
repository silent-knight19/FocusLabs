import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './styles/Login.css';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* Gradient Overlay */}
      <div className="login-gradient-overlay"></div>

      <div className="login-card animate-card-entrance">
        {/* Animated border */}
        <div className="login-card-border"></div>
        
        <div className="login-header">
          <div className="login-logo-container">
            <div className="login-logo-glow"></div>
            <img src="/logo.png" alt="FocusLabs Logo" className="login-logo" />
            <h1 className="login-title">FocusLabs</h1>
          </div>
          <p className="login-subtitle">Track your habits, achieve your goals</p>
        </div>

        {/* Feature highlights */}
        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">🎯</span>
            <span className="login-feature-text">Daily Habit Tracking</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">📊</span>
            <span className="login-feature-text">Visual Analytics</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">⚡</span>
            <span className="login-feature-text">Streak Motivation</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="google-signin-button"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Signing in...
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Error Display */}
        {(error || authError) && (
          <div className="login-error">
            {error || authError}
          </div>
        )}

        <div className="login-footer">
          <p className="login-footer-text">
            🔒 Your data is securely stored and synced using Firebase
          </p>
        </div>
      </div>
    </div>
  );
}

