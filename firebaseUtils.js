// firebaseUtils.js
const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let db = null;

function initializeFirebase() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  db = getFirestore();
  return db;
}

async function incrementVisitorCount(userId) {
  if (!db) initializeFirebase();
  const userRef = doc(db, "users", userId);
  const now = new Date().toISOString();
  // Use merge with server transform so we don't set any custom defaults
  await setDoc(
    userRef,
    {
      visitorCount: increment(1),
      lastVisit: now,
    },
    { merge: true }
  );
}

async function getUserData(userId) {
  if (!db) initializeFirebase();
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
}

// Realtime subscription using snapshots
function subscribeToUserData(userId, onData, onError) {
  if (!db) initializeFirebase();
  const userRef = doc(db, "users", userId);
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      } else {
        onData(null);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
  return unsubscribe;
}

async function setUserBadge(userId, badge) {
  if (!db) initializeFirebase();
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { badge }, { merge: true });
}

module.exports = {
  initializeFirebase,
  incrementVisitorCount,
  getUserData,
  subscribeToUserData,
  setUserBadge,
};
