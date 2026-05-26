// Elbaf Gaming - Firebase Configuration & Initialization (English Edition)
// This file sets up Firebase Auth & Firestore.
// It detects whether real Firebase API keys have been provided.
// If dummy/placeholder keys are detected, it seamlessly falls back to a robust Mock Storage System.

// WARNING: Replace these credentials with your actual Firebase project settings.
// You can get this config block from the Firebase Console (Project Settings -> Web App).
const firebaseConfig = {
  apiKey: "AIzaSyCOlAkVdxqXuWh7iBJL4Ammiiqm_3VRjGE",
  authDomain: "dgaming-24590.firebaseapp.com",
  projectId: "dgaming-24590",
  storageBucket: "dgaming-24590.firebasestorage.app",
  messagingSenderId: "35323894109",
  appId: "1:35323894109:web:6847df99befd9aaf7ef0b4"
};

// State variables
let db = null;
let auth = null;
let useFirebaseMock = false;

// Checking if keys are still default templates
const isMockConfig = 
  firebaseConfig.apiKey.includes("YOUR_FIREBASE") || 
  firebaseConfig.apiKey === "" ||
  firebaseConfig.appId.includes("YOUR_APP");

if (isMockConfig) {
  console.log("🎮 Elbaf Gaming: Running in MOCK DATABASE mode (using LocalStorage). Firebase is not initialized yet.");
  useFirebaseMock = false;
} else {
  // If keys are modified, dynamically import Firebase scripts and initialize them
  try {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      useFirebaseMock = false;
      console.log("🔥 Elbaf Gaming: Successfully connected to Real FIREBASE Database & Auth! 🚀");
    } else {
      console.warn("Firebase scripts not loaded. Falling back to LocalStorage Mock.");
      useFirebaseMock = false;
    }
  } catch (error) {
    console.error("Failed to initialize Firebase. Falling back to Mock Storage.", error);
    useFirebaseMock = false;
  }
}

// Make variables globally accessible
window.useFirebaseMock = useFirebaseMock;
window.firebaseDb = db;
window.firebaseAuth = auth;
