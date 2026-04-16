import { doc, setDoc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getYearMonth, getDayFromDateKey } from './dateHelpers';

const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};
const error = DEBUG ? console.error : () => {};

/**
 * Migration utility for converting old single-document completions
 * to new monthly-sharded structure
 * 
 * OLD: users/{uid}/data/completions -> { value: { habitId: { "2024-01-15": "completed" } } }
 * NEW: users/{uid}/completions/2024-01 -> { habitId: { "15": "completed" } }
 */

/**
 * Check if user has old-format completion data
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasOldCompletionData(userId) {
  try {
    const oldDocRef = doc(db, 'users', userId, 'data', 'completions');
    const snapshot = await getDoc(oldDocRef);
    
    if (!snapshot.exists()) return false;
    
    const data = snapshot.data();
    // Old format has { value: { ... } } structure
    return data && typeof data.value === 'object';
  } catch (err) {
    error('[Migration] Error checking old data:', err);
    return false;
  }
}

/**
 * Check if user has already migrated to new format
 * Checks for ANY monthly completion document (not just current month)
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasNewCompletionData(userId) {
  try {
    // Check if any monthly document exists by querying with limit 1
    const completionsRef = collection(db, 'users', userId, 'completions');
    const q = query(completionsRef, limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (err) {
    error('[Migration] Error checking new data:', err);
    return false;
  }
}

/**
 * Migrate old completion data to new monthly format
 * @param {string} userId
 * @returns {Promise<{success: boolean, monthsMigrated: number, totalEntries: number, error?: string}>}
 */
export async function migrateCompletions(userId) {
  log('[Migration] Starting migration for user:', userId);
  
  try {
    // Read old data
    const oldDocRef = doc(db, 'users', userId, 'data', 'completions');
    const oldSnapshot = await getDoc(oldDocRef);
    
    if (!oldSnapshot.exists()) {
      log('[Migration] No old data to migrate');
      return { success: true, monthsMigrated: 0, totalEntries: 0 };
    }
    
    const oldData = oldSnapshot.data().value || {};
    const monthlyData = {};
    let totalEntries = 0;
    
    // Transform old data into monthly buckets
    Object.entries(oldData).forEach(([habitId, habitCompletions]) => {
      Object.entries(habitCompletions).forEach(([dateKey, status]) => {
        const monthKey = getYearMonth(new Date(dateKey));
        const day = getDayFromDateKey(dateKey);
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {};
        }
        if (!monthlyData[monthKey][habitId]) {
          monthlyData[monthKey][habitId] = {};
        }
        
        monthlyData[monthKey][habitId][day] = status;
        totalEntries++;
      });
    });
    
    // Write monthly documents
    const monthsMigrated = Object.keys(monthlyData).length;
    log(`[Migration] Writing ${monthsMigrated} month documents...`);
    
    for (const [monthKey, data] of Object.entries(monthlyData)) {
      const monthDocRef = doc(db, 'users', userId, 'completions', monthKey);
      await setDoc(monthDocRef, data);
      log(`[Migration] Migrated ${monthKey}:`, Object.keys(data).length, 'habits');
    }
    
    log(`[Migration] Complete! Migrated ${totalEntries} entries across ${monthsMigrated} months`);
    
    return {
      success: true,
      monthsMigrated,
      totalEntries
    };
    
  } catch (err) {
    error('[Migration] Migration failed:', err);
    return {
      success: false,
      monthsMigrated: 0,
      totalEntries: 0,
      error: err.message
    };
  }
}

/**
 * Run migration if needed - can be called on app startup
 * @param {string} userId
 * @returns {Promise<{migrated: boolean, result?: object}>}
 */
export async function runMigrationIfNeeded(userId) {
  if (!userId) return { migrated: false };
  
  const hasOld = await hasOldCompletionData(userId);
  const hasNew = await hasNewCompletionData(userId);
  
  // Only migrate if there's old data AND no new data yet
  if (hasOld && !hasNew) {
    log('[Migration] Old data detected, new format not found - running migration...');
    const result = await migrateCompletions(userId);
    return { migrated: result.success, result };
  }
  
  log('[Migration] No migration needed - already migrated or no old data');
  return { migrated: false };
}
