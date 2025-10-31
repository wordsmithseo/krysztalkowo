// ===== KONFIGURACJA FIREBASE =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyB1MhW9A8RaNffW9yoIYgeruY_6VytSrJM",
  authDomain: "krysztalkowo-561e4.firebaseapp.com",
  databaseURL: "https://krysztalkowo-561e4-default-rtdb.firebaseio.com",
  projectId: "krysztalkowo-561e4",
  storageBucket: "krysztalkowo-561e4.firebasestorage.app",
  messagingSenderId: "77455685375",
  appId: "1:77455685375:web:30e3a726b9f164774ebeca",
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth };