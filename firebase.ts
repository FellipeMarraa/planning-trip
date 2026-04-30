import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBwVVrDj-XE1TQ3PgLkrOmEsQJnDVyMTSI",
    authDomain: "planning-trip-6a9cb.firebaseapp.com",
    projectId: "planning-trip-6a9cb",
    storageBucket: "planning-trip-6a9cb.firebasestorage.app",
    messagingSenderId: "724129434671",
    appId: "1:724129434671:web:9a70362104f176b4200ada",
    measurementId: "G-5Y4W48YX7J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();