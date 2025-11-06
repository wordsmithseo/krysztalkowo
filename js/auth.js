// ===== KONFIGURACJA FIREBASE =====
import { db, auth } from './config.js';
import { ref, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

// Funkcja inicjalizacji profilu nowego użytkownika
export const initializeUserProfile = async (userId, name, email) => {
  try {
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    await set(userProfileRef, {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      initialized: true
    });
    console.log('Profil użytkownika został zainicjalizowany');
    return { success: true };
  } catch (error) {
    console.error('Błąd podczas inicjalizacji profilu:', error);
    return { success: false, error: error.message };
  }
};

// Funkcja rejestracji
export const registerUser = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Inicjalizuj profil użytkownika
    try {
      await initializeUserProfile(userCredential.user.uid, name, email);
      console.log('Profil użytkownika został utworzony');
    } catch (profileError) {
      console.error('Błąd podczas tworzenia profilu:', profileError);
      // Nie blokujemy rejestracji jeśli profil się nie utworzy
    }

    // Wyślij email weryfikacyjny
    try {
      await sendEmailVerification(userCredential.user, {
        url: window.location.origin, // URL do przekierowania po weryfikacji
        handleCodeInApp: false
      });
      console.log('Email weryfikacyjny został wysłany');
    } catch (emailError) {
      console.error('Błąd podczas wysyłania emaila weryfikacyjnego:', emailError);
      // Nie blokujemy rejestracji jeśli email się nie wyśle
    }

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

export { auth };