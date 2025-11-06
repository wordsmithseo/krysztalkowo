// ===== KONFIGURACJA FIREBASE =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

// Funkcja logowania
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = 'Błąd logowania';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Nieprawidłowy adres email';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Konto zostało zablokowane';
        break;
      case 'auth/user-not-found':
        errorMessage = 'Nie znaleziono użytkownika o podanym adresie email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Nieprawidłowe hasło';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Nieprawidłowy email lub hasło';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Zbyt wiele prób logowania. Spróbuj ponownie później';
        break;
      default:
        errorMessage = `Błąd logowania: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Funkcja rejestracji
export const registerUser = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = 'Błąd rejestracji';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Konto z tym adresem email już istnieje';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Nieprawidłowy adres email';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Rejestracja jest wyłączona';
        break;
      case 'auth/weak-password':
        errorMessage = 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków';
        break;
      default:
        errorMessage = `Błąd rejestracji: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Funkcja wylogowania
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Błąd wylogowania: ' + error.message };
  }
};

// Funkcja nasłuchująca zmian stanu uwierzytelniania
export const setupAuthListener = (callback) => {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Funkcja zwracająca aktualnego użytkownika
export const getCurrentAuthUser = () => {
  return auth.currentUser;
};

// Funkcja usuwająca konto użytkownika
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'Użytkownik nie jest zalogowany' };
    }

    await deleteUser(user);
    return { success: true };
  } catch (error) {
    let errorMessage = 'Błąd usuwania konta';

    switch (error.code) {
      case 'auth/requires-recent-login':
        errorMessage = 'Ze względów bezpieczeństwa musisz się ponownie zalogować przed usunięciem konta';
        break;
      default:
        errorMessage = `Błąd usuwania konta: ${error.message}`;
    }

    return { success: false, error: errorMessage };
  }
};

export { db, auth };