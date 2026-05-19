
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUG-cActa0RksIaaaU_7z2vjQ9wRvCYDI",
  authDomain: "maspolyclinic.firebaseapp.com",
  projectId: "maspolyclinic",
  storageBucket: "maspolyclinic.firebasestorage.app",
  messagingSenderId: "1043942131040",
  appId: "1:1043942131040:web:9afd5a163a613338fdca05"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
