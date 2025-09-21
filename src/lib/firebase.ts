
'use client';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    onSnapshot,
    writeBatch,
    runTransaction,
    updateDoc,
    arrayUnion,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { 
    app, 
    db,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    onSnapshot,
    writeBatch,
    runTransaction,
    updateDoc,
    arrayUnion,
};

    