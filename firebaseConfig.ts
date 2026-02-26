
// Cleaned up Firebase v9+ imports to ensure named exports are correctly recognized by the compiler.
// Fix: Use namespaced import for firebase/app to resolve compiler errors regarding missing named exports.
import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBn0caqaNugy1n3yZZlUJiixFfqesr8YRg",
  authDomain: "suranjan-chat-demo.firebaseapp.com",
  projectId: "suranjan-chat-demo",
  storageBucket: "suranjan-chat-demo.firebasestorage.app",
  messagingSenderId: "749448803449",
  appId: "1:749448803449:web:50ee356a5481d689dad0a8"
};

// Initialize Firebase only if it hasn't been initialized yet to avoid errors in high-concurrency or HMR environments.
const app = firebaseApp.getApps().length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();