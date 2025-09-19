
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
  projectId: 'studio-7086354571-8fddd',
  appId: '1:371450476800:web:8699cefa33e9e5bb431be5',
  storageBucket: 'studio-7086354571-8fddd.firebasestorage.app',
  apiKey: 'AIzaSyAgsF--at0khZHo9zEdC6tHTBc6-mOh2bg',
  authDomain: 'studio-7086354571-8fddd.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '371450476800',
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

    