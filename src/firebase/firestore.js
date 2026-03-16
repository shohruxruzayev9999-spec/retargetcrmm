// src/firebase/firestore.js
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ── Users ──────────────────────────────────────────────
export const getUserProfile = (uid) =>
  getDoc(doc(db, 'users', uid)).then((s) => (s.exists() ? { id: s.id, ...s.data() } : null));

export const setUserProfile = (uid, data) =>
  setDoc(doc(db, 'users', uid), data, { merge: true });

export const getUserPrivate = (uid) =>
  getDoc(doc(db, 'userPrivate', uid)).then((s) => (s.exists() ? s.data() : null));

export const setUserPrivate = (uid, data) =>
  setDoc(doc(db, 'userPrivate', uid), data, { merge: true });

export const subscribeUsers = (callback) =>
  onSnapshot(collection(db, 'users'), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

// ── Projects ───────────────────────────────────────────
export const subscribeProjects = (callback) =>
  onSnapshot(
    query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const subscribeEmployeeProjects = (uid, callback) =>
  onSnapshot(
    query(collection(db, 'projects'), where('teamIds', 'array-contains', uid)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const addProject = (data) =>
  addDoc(collection(db, 'projects'), { ...data, createdAt: serverTimestamp() });

export const updateProject = (id, data) =>
  updateDoc(doc(db, 'projects', id), data);

export const deleteProject = (id) =>
  deleteDoc(doc(db, 'projects', id));

// ── Sub-collections (tasks, content, etc.) ────────────
export const subscribeSubCollection = (projectId, sub, callback) =>
  onSnapshot(
    collection(db, 'projects', projectId, sub),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const addSubDoc = (projectId, sub, data) =>
  addDoc(collection(db, 'projects', projectId, sub), {
    ...data,
    createdAt: serverTimestamp(),
  });

export const updateSubDoc = (projectId, sub, docId, data) =>
  updateDoc(doc(db, 'projects', projectId, sub, docId), data);

export const deleteSubDoc = (projectId, sub, docId) =>
  deleteDoc(doc(db, 'projects', projectId, sub, docId));

// ── Shoots ─────────────────────────────────────────────
export const subscribeShoots = (callback) =>
  onSnapshot(
    query(collection(db, 'shoots'), orderBy('date', 'asc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const addShoot = (data) =>
  addDoc(collection(db, 'shoots'), { ...data, createdAt: serverTimestamp() });

export const updateShoot = (id, data) =>
  updateDoc(doc(db, 'shoots', id), data);

export const deleteShoot = (id) =>
  deleteDoc(doc(db, 'shoots', id));

// ── Meetings ───────────────────────────────────────────
export const subscribeMeetings = (callback) =>
  onSnapshot(
    query(collection(db, 'meetings'), orderBy('date', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const addMeeting = (data) =>
  addDoc(collection(db, 'meetings'), { ...data, createdAt: serverTimestamp() });

export const updateMeeting = (id, data) =>
  updateDoc(doc(db, 'meetings', id), data);

export const deleteMeeting = (id) =>
  deleteDoc(doc(db, 'meetings', id));

// ── Notifications ──────────────────────────────────────
export const subscribeNotifications = (uid, callback) =>
  onSnapshot(
    query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      orderBy('createdAt', 'desc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const markNotificationRead = (id) =>
  updateDoc(doc(db, 'notifications', id), { read: true });

export const markAllNotificationsRead = async (uid) => {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      where('read', '==', false)
    )
  );
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  return batch.commit();
};

export const addNotification = (data) =>
  addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
