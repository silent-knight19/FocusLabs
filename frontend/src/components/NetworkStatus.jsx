import React, { useState, useEffect } from 'react';
import { onSnapshotsInSync } from 'firebase/firestore';
import { db } from '../config/firebase';
import './NetworkStatus.css';

export function NetworkStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setSyncing(true);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshotsInSync(db, () => setSyncing(false));
    return () => unsub();
  }, []);

  if (online && !syncing) return null;

  return (
    <div className={`network-status ${online ? 'network-syncing' : 'network-offline'}`} role="status">
      {!online
        ? "You're offline. Changes will sync when connected."
        : 'Syncing changes...'}
    </div>
  );
}
