import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANtU-Zbwx8qdYzXdQdcB1scIm8PG37I2A",
  authDomain: "avr-cinema-app.firebaseapp.com",
  projectId: "avr-cinema-app",
  storageBucket: "avr-cinema-app.firebasestorage.app",
  messagingSenderId: "678679269485",
  appId: "1:678679269485:web:7e23c26d61d5b35b916f64",
  measurementId: "G-YXSNBYEC21"
};
const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
