'use server'

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import authData from './auth-data.json';

const { firestore: db } = initializeFirebase();

export async function logActivity(username: string, type: 'login' | 'view_panel', details?: { panelId?: string, panelName?: string }) {
  if (!db) return;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const currentDayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Log the individual event
  if (type === 'login') {
    await addDoc(collection(db, 'user_activity'), {
      username,
      type,
      ...details,
      timestamp: serverTimestamp()
    });
  } else if (type === 'view_panel') {
    const { panelId, panelName } = details || {};
    const dailyViewId = `view_${username}_${panelId}_${currentDayKey}`;
    const activityRef = doc(db, 'user_activity', dailyViewId);
    
    // Usar setDoc para que si ya existe hoy, solo se sobrescriba (o se ignore)
    // Esto garantiza 1 solo registro por panel/usuario/día
    const activitySnap = await getDoc(activityRef);
    const isNewDayVisit = !activitySnap.exists();

    await setDoc(activityRef, {
      username,
      type: 'view_panel',
      panelId,
      panelName,
      timestamp: serverTimestamp(),
      date: currentDayKey
    }, { merge: true });

    // Actualizar estadísticas globales del panel si es una visita nueva hoy
    if (isNewDayVisit && panelId) {
      const globalPanelRef = doc(db, 'panel_stats', panelId);
      await setDoc(globalPanelRef, {
        name: panelName,
        views: increment(1),
        lastViewed: serverTimestamp()
      }, { merge: true });
    }
  }

  // 2. Update user profile/stats
  const profileRef = doc(db, 'user_stats', username);
  const profileSnap = await getDoc(profileRef);

  if (type === 'login') {
    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        username,
        lastLogin: serverTimestamp(),
        lastDailyAccess: currentDayKey,
        totalAccesses: 1,
        monthlyStats: {
          [currentMonthKey]: 1
        },
        dailyStats: {
          [currentDayKey]: 1
        }
      });
    } else {
      const data = profileSnap.data();
      const monthlyStats = data.monthlyStats || {};
      const dailyStats = data.dailyStats || {};
      
      const currentMonthValue = (monthlyStats[currentMonthKey] || 0) + 1;
      const currentDayValue = (dailyStats[currentDayKey] || 0) + 1;

      await updateDoc(profileRef, {
        lastLogin: serverTimestamp(),
        lastDailyAccess: currentDayKey,
        totalAccesses: increment(1),
        [`monthlyStats.${currentMonthKey}`]: currentMonthValue,
        [`dailyStats.${currentDayKey}`]: currentDayValue
      });
    }
  }
}

export async function getUserStats(month?: number, year?: number) {
  const { firestore: db } = initializeFirebase();
  if (!db) return { users: [], activities: [] };

  const now = new Date();
  const targetMonth = month !== undefined ? month : now.getMonth() + 1;
  const targetYear = year !== undefined ? year : now.getFullYear();

  // Get all user stats
  const statsSnap = await getDocs(collection(db, 'user_stats'));
  const users = statsSnap.docs
    .map(doc => {
      const data = doc.data();
      const userAuth = authData.find(u => u.username === data.username);
      return {
        id: doc.id,
        ...data,
        role: userAuth?.role || 'usuario',
        // Convert Timestamps to plain objects/numbers for Next.js serialization
        lastLogin: data.lastLogin ? {
          seconds: data.lastLogin.seconds,
          nanoseconds: data.lastLogin.nanoseconds
        } : null
      };
    })
    .filter(u => u.role === 'usuario');

  // Get activity for details
  // Use Timestamp instead of 'date' string to include older records that don't have the date field
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  const activitySnap = await getDocs(query(
    collection(db, 'user_activity'),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'desc')
  ));
  
  const activities = activitySnap.docs
    .map(doc => {
      const data = doc.data();
      const userAuth = authData.find(u => u.username === data.username);
      return {
        id: doc.id,
        ...data,
        role: userAuth?.role || 'usuario',
        timestamp: data.timestamp ? {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        } : null
      };
    })
    .filter((act: any) => act.type === 'view_panel' && act.role === 'usuario');

  return { users, activities };
}

export async function getTopPanels() {
  const { firestore: db } = initializeFirebase();
  if (!db) return [];
  
  const q = query(
    collection(db, 'panel_stats'),
    orderBy('views', 'desc'),
    limit(10)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      lastViewed: data.lastViewed ? {
        seconds: data.lastViewed.seconds,
        nanoseconds: data.lastViewed.nanoseconds
      } : null
    };
  });
}
