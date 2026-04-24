// VELQOR JOURNAL — Firestore Database
import {
  getFirestore, collection, doc, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let _db;

export const DB = {
  init(app) { _db = getFirestore(app); },

  // === PROFILE ===
  async createProfile(uid, data) {
    await setDoc(doc(_db, 'users', uid), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  },
  async getProfile(uid) {
    const snap = await getDoc(doc(_db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async updateProfile(uid, data) {
    await updateDoc(doc(_db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
  },
  watchProfile(uid, cb) {
    return onSnapshot(doc(_db, 'users', uid), snap => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
  },

  // === ACCOUNTS ===
  async addAccount(uid, account) {
    return await addDoc(collection(_db, 'users', uid, 'accounts'), {
      ...account, createdAt: serverTimestamp()
    });
  },
  async updateAccount(uid, accountId, data) {
    await updateDoc(doc(_db, 'users', uid, 'accounts', accountId), data);
  },
  async deleteAccount(uid, accountId) {
    await deleteDoc(doc(_db, 'users', uid, 'accounts', accountId));
  },
  watchAccounts(uid, cb) {
    const q = query(collection(_db, 'users', uid, 'accounts'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  // === TRADES ===
  async addTrade(uid, trade) {
    return await addDoc(collection(_db, 'users', uid, 'trades'), {
      ...trade, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
  },
  async updateTrade(uid, tradeId, data) {
    await updateDoc(doc(_db, 'users', uid, 'trades', tradeId), { ...data, updatedAt: serverTimestamp() });
  },
  async deleteTrade(uid, tradeId) {
    await deleteDoc(doc(_db, 'users', uid, 'trades', tradeId));
  },
  watchTrades(uid, cb) {
    const q = query(collection(_db, 'users', uid, 'trades'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  // === PLAYBOOK ===
  async addSetup(uid, setup) {
    return await addDoc(collection(_db, 'users', uid, 'playbook'), { ...setup, createdAt: serverTimestamp() });
  },
  async updateSetup(uid, setupId, data) {
    await updateDoc(doc(_db, 'users', uid, 'playbook', setupId), { ...data, updatedAt: serverTimestamp() });
  },
  async deleteSetup(uid, setupId) {
    await deleteDoc(doc(_db, 'users', uid, 'playbook', setupId));
  },
  watchPlaybook(uid, cb) {
    const q = query(collection(_db, 'users', uid, 'playbook'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  // === REVIEWS ===
  async addReview(uid, review) {
    return await addDoc(collection(_db, 'users', uid, 'reviews'), { ...review, createdAt: serverTimestamp() });
  },
  async updateReview(uid, reviewId, data) {
    await updateDoc(doc(_db, 'users', uid, 'reviews', reviewId), { ...data, updatedAt: serverTimestamp() });
  },
  async deleteReview(uid, reviewId) {
    await deleteDoc(doc(_db, 'users', uid, 'reviews', reviewId));
  },
  watchReviews(uid, cb) {
    const q = query(collection(_db, 'users', uid, 'reviews'), orderBy('startDate', 'desc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  // === MILESTONES ===
  async addMilestone(uid, ms) {
    return await addDoc(collection(_db, 'users', uid, 'milestones'), { ...ms, createdAt: serverTimestamp() });
  },
  async updateMilestone(uid, msId, data) {
    await updateDoc(doc(_db, 'users', uid, 'milestones', msId), data);
  },
  async deleteMilestone(uid, msId) {
    await deleteDoc(doc(_db, 'users', uid, 'milestones', msId));
  },
  watchMilestones(uid, cb) {
    const q = query(collection(_db, 'users', uid, 'milestones'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  toTimestamp(dateStr) { return Timestamp.fromDate(new Date(dateStr)); }
};
