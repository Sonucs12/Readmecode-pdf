// firebaseUtils.js
const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  // Remove serverTimestamp import
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
let isInitialized = false;

function initializeFirebase() {
  try {
    if (!isInitialized) {
      if (!getApps().length) {
        console.log("🔥 Initializing Firebase app...");
        initializeApp(firebaseConfig);
        console.log("✅ Firebase app initialized");
      }
      db = getFirestore();
      isInitialized = true;
      console.log("✅ Firestore database connected");
    }
    return db;
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    throw error;
  }
}

async function incrementVisitorCount(userId) {
  try {
    if (!db) initializeFirebase();
    const userRef = doc(db, "users", userId);

    // Get current data first
    const userSnap = await getDoc(userRef);
    const currentData = userSnap.exists() ? userSnap.data() : {};
    const currentCount = currentData.visitorCount || 0;

    // Increment and preserve existing badge field
    await setDoc(
      userRef,
      {
        badge: currentData.badge || "style1", // Preserve existing badge or default
        visitorCount: currentCount + 1,
        lastVisit: new Date().toISOString(), // Use ISO string for consistency
      },
      { merge: true }
    );
    console.log(
      `✅ Successfully incremented visitor count for user: ${userId} from ${currentCount} to ${
        currentCount + 1
      }`
    );
  } catch (error) {
    console.error(
      `❌ Error incrementing visitor count for user ${userId}:`,
      error
    );
    throw error;
  }
}

async function getUserData(userId) {
  try {
    if (!db) initializeFirebase();
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const data = userSnap.exists() ? userSnap.data() : null;
    console.log(`📊 Retrieved user data for ${userId}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error getting user data for ${userId}:`, error);
    throw error;
  }
}

// Upsert init data coming from frontend init flow
async function upsertInitData(userId, initData, options = {}) {
  try {
    if (!db) initializeFirebase();
    const userRef = doc(db, "users", userId);
    const { style, timestamp, receivedAt } = initData || {};
    const payload = {};
    if (style) payload.badge = style;
    if (timestamp) payload.initTimestamp = timestamp;
    if (receivedAt) payload.initReceivedAt = receivedAt;
    if (options.verified === true) {
      payload.verified = true;
      payload.dataVerified = true;
    }
    payload.lastInitSync = new Date().toISOString();
    await setDoc(userRef, payload, { merge: true });
    console.log(`✅ Upserted init data for ${userId}:`, payload);
  } catch (error) {
    console.error(`❌ Error upserting init data for ${userId}:`, error);
    throw error;
  }
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
  try {
    if (!db) initializeFirebase();
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { badge }, { merge: true });
    console.log(`✅ Successfully set badge for user: ${userId} to ${badge}`);
  } catch (error) {
    console.error(`❌ Error setting badge for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  incrementVisitorCount,
  getUserData,
  subscribeToUserData,
  setUserBadge,
  upsertInitData,
};
