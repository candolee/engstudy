import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "scordboard",
  appId: "1:30546922123:web:375c502f5213ca9de8228e",
  storageBucket: "scordboard.firebasestorage.app",
  apiKey: "AIzaSyA7Ks3Iftl0OQfYEM-fMdqbPvk7Os5kbmA",
  authDomain: "scordboard.firebaseapp.com",
  messagingSenderId: "30546922123",
  measurementId: "G-FWXJGHS5DD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
