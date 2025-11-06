// ===== GŁÓWNY PLIK APLIKACJI =====
import { state, setCurrentUser, getCachedData, setCategories, setRewards } from './state.js';
import {
  setupRealtimeListener,
  listenRewardsForUser,
  listenChildren,
  listenAllChildrenData,
  changeUserPassword,
  resetAllRankings
} from './database.js';
import {
  elements,
  switchUser,
  loadAvatar,
  displayRanking,
  updateUserButtons,
  showEmptyStateGuide,
  displayPendingRewards,
  showProfileLoader,
  hideProfileLoader,
  renderCategories
} from './ui.js';
import {
  initializeSortable,
  renderAdminCategories,
  renderAdminRewards,
  renderChildrenList,
  handleAddCategory,
  handleSaveEdit,
  handleSaveChild,
  setLoggedInUi,
  handleAddReward,
  handleSetAvatar,
  handleResetRanking,
  openAddChildModal,
  showLogoutConfirmModal,
  updateAdminHeaderInfo,
  handleEditReward,
  handleSaveRewardEdit,
  updateProbabilityInfo,
  renderCategorySuggestions,
  renderRewardSuggestions,
  openGalleryModal
} from './admin.js';
import { getAvatar, deleteAllUserData } from './database.js';
import { setupAuthListener, loginUser, registerUser, logoutUser, getCurrentAuthUser, deleteUserAccount } from './auth.js';

const passwordModal = document.getElementById('passwordModal');
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const rankingModal = document.getElementById('rankingModal');
const childModal = document.getElementById('childModal');
const authModal = document.getElementById('authModal');
const pendingRewardsModal = document.getElementById('pendingRewardsModal');
const editRewardModal = document.getElementById('editRewardModal');
const resetRankingPasswordModal = document.getElementById('resetRankingPasswordModal');
const resetRankingSuccessModal = document.getElementById('resetRankingSuccessModal');
const deleteAccountPasswordModal = document.getElementById('deleteAccountPasswordModal');
const galleryModal = document.getElementById('galleryModal');
const appLoader = document.getElementById('appLoader');

const adminPasswordInput = document.getElementById('adminPasswordInput');
const submitPassword = document.getElementById('submitPassword');
const logoutBtn = document.getElementById('logoutBtn');
const closeButtons = document.querySelectorAll('.close-btn');

const addCategoryBtn = document.getElementById('addCategoryBtn');
const saveEditBtn = document.getElementById('saveEditBtn');
const backToAdminBtn = document.getElementById('backToAdminBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const addRewardBtn = document.getElementById('addRewardBtn');
const setAvatarBtn = document.getElementById('setAvatarBtn');
const openGalleryBtn = document.getElementById('openGalleryBtn');
const resetRankingBtn = document.getElementById('resetRankingBtn');
const addChildBtn = document.getElementById('addChildBtn');
const saveChildBtn = document.getElementById('saveChildBtn');
const pendingRewardsBtn = document.getElementById('pendingRewardsBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const deleteAccountPasswordInput = document.getElementById('deleteAccountPasswordInput');
const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');

// Elementy uwierzytelniania
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const authLogoutBtn = document.getElementById('authLogoutBtn');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

window.updateUserButtons = updateUserButtons;

// Flaga dla opóźnionego renderowania
let dataLoaded = false;
let appFullyLoaded = false;
let childrenLoaded = false;

// Funkcja ukrywania loadera
const hideLoader = () => {
  if (appFullyLoaded) return;
  appFullyLoaded = true;
  
  setTimeout(() => {
    appLoader.classList.add('hidden');
    setTimeout(() => {
      appLoader.style.display = 'none';
    }, 500);
  }, 300);
};

// Funkcja pokazująca błąd
const showError = (element, message) => {
  element.textContent = message;
  element.style.display = 'block';
  element.style.padding = '0.75rem';
  element.style.margin = '0.75rem 0';
  element.style.background = '#fee';
  element.style.border = '1px solid #fcc';
  element.style.borderRadius = '0.5rem';
  element.style.color = '#c33';
  element.style.fontSize = '0.9rem';
};

// Funkcja ukrywająca błąd
const hideError = (element) => {
  element.style.display = 'none';
};

// Funkcja automatycznego ładowania profilu dziecka
const autoLoadChildProfile = () => {
  const children = state.children;
  
  if (children.length === 0) {
    // Brak dzieci - pokaż pusty stan
    dataLoaded = true;
    checkEmptyStates();
    hideLoader();
    return;
  }
  
  // Sprawdź czy jest zapisany wybór w localStorage
  const savedUserId = localStorage.getItem('selectedChildId');
  let selectedChild = null;
  
  // Jeśli jest zapisany wybór i dziecko nadal istnieje, użyj go
  if (savedUserId && children.find(c => c.id === savedUserId)) {
    selectedChild = children.find(c => c.id === savedUserId);
  } else {
    // W przeciwnym razie wybierz pierwsze dziecko
    selectedChild = children[0];
  }
  
  // Pokaż loader profilu podczas ładowania
  showProfileLoader(selectedChild.name);

  // Zapisz wybór do localStorage
  localStorage.setItem('selectedChildId', selectedChild.id);

  // Ustaw odpowiednie tło
  const bgClass = selectedChild.gender === 'male' ? 'maks-bg' : 'nina-bg';
  const otherBgClass = selectedChild.gender === 'male' ? 'nina-bg' : 'maks-bg';
  document.body.classList.remove(otherBgClass);
  document.body.classList.add(bgClass);

  // Usuń active-user ze wszystkich przycisków i ustaw dla wybranego dziecka
  document.querySelectorAll('.user-btn').forEach(btn => {
    btn.classList.remove('active-user');
  });

  const activeBtn = document.getElementById(`user-${selectedChild.id}`);
  if (activeBtn) {
    activeBtn.classList.add('active-user');
  }

  setCurrentUser(selectedChild.id);

  // Załaduj cached data i wyrenderuj kategorie
  const cached = getCachedData(selectedChild.id);
  if (cached.categories) {
    setCategories(cached.categories);
    renderCategories();
  }
  if (cached.rewards) {
    setRewards(cached.rewards);
  }

  // Dane są już ładowane przez listenAllChildrenData(), ale dla pewności
  // wywołujemy również listenery dla aktualnie wybranego dziecka
  setupRealtimeListener(selectedChild.id);
  listenRewardsForUser(selectedChild.id);

  // Opóźnione sprawdzanie pustych stanów - dopiero po załadowaniu danych
  setTimeout(() => {
    dataLoaded = true;
    checkEmptyStates();
    hideLoader();
    // Ukryj loader profilu po zakończeniu
    hideProfileLoader();
  }, 1000);
};

// Obsługa uwierzytelniania
setupAuthListener((user) => {
  if (user) {
    // Użytkownik zalogowany - ukryj modal i pokaż aplikację
    authModal.style.display = 'none';
    document.querySelector('.crystal-app').style.display = 'flex';
    document.getElementById('userEmail').textContent = user.email;
    
    // Inicjalizacja nasłuchiwania zmian
    listenChildren();
    
    // Poczekaj na załadowanie dzieci z małym opóźnieniem
    const waitForChildren = setInterval(() => {
      const children = state.children;

      // Sprawdź czy dzieci zostały faktycznie załadowane (tablica nie jest pusta)
      if (children && children.length > 0) {
        clearInterval(waitForChildren);
        childrenLoaded = true;

        // Zaktualizuj przyciski użytkowników
        updateUserButtons();

        // Załaduj dane dla wszystkich dzieci (potrzebne do rankingu)
        // Czekamy aż dane się załadują zanim załadujemy profil dziecka
        listenAllChildrenData(children).then(() => {
          // Automatycznie załaduj profil dziecka po załadowaniu danych
          autoLoadChildProfile();
        });
      }
    }, 100);
    
    // Zabezpieczenie - jeśli po 3 sekundach nie załadowano dzieci
    setTimeout(() => {
      if (!childrenLoaded) {
        clearInterval(waitForChildren);
        childrenLoaded = true;

        // Zaktualizuj przyciski (pokaże pusty stan jeśli brak dzieci)
        updateUserButtons();

        dataLoaded = true;
        checkEmptyStates();
        hideLoader();
      }
    }, 3000);
  } else {
    // Użytkownik niezalogowany - pokaż modal uwierzytelniania
    authModal.style.display = 'flex';
    document.querySelector('.crystal-app').style.display = 'none';
    dataLoaded = false;
    childrenLoaded = false;
    hideLoader();
  }
});

const checkEmptyStates = () => {
  if (dataLoaded) {
    showEmptyStateGuide();
  }
};

// Przełączanie między logowaniem a rejestracją
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    hideError(registerError);
  });
}

if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    hideError(loginError);
  });
}

// Logowanie
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', async () => {
    hideError(loginError);

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError(loginError, 'Podaj email i hasło!');
      return;
    }

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Weryfikacja...';

    try {
      // Wykonaj reCAPTCHA v3
      const token = await grecaptcha.execute('6Lc6LwQsAAAAACRvem7Pfl5U1-ST3TDaJ3Frtvj8', { action: 'login' });

      if (!token) {
        showError(loginError, 'Błąd weryfikacji reCAPTCHA. Spróbuj ponownie.');
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Zaloguj się';
        return;
      }

      loginSubmitBtn.textContent = 'Logowanie...';
      const result = await loginUser(email, password);

      if (result.success) {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        hideError(loginError);
      } else {
        showError(loginError, result.error);
      }
    } catch (error) {
      console.error('Błąd reCAPTCHA:', error);
      showError(loginError, 'Błąd weryfikacji. Spróbuj ponownie.');
    }

    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Zaloguj się';
  });
}

// Rejestracja
if (registerSubmitBtn) {
  registerSubmitBtn.addEventListener('click', async () => {
    hideError(registerError);

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
      showError(registerError, 'Wypełnij wszystkie pola!');
      return;
    }

    if (password !== confirmPassword) {
      showError(registerError, 'Hasła nie są identyczne!');
      return;
    }

    if (password.length < 6) {
      showError(registerError, 'Hasło musi mieć co najmniej 6 znaków!');
      return;
    }

    registerSubmitBtn.disabled = true;
    registerSubmitBtn.textContent = 'Weryfikacja...';

    try {
      // Wykonaj reCAPTCHA v3
      const token = await grecaptcha.execute('6Lc6LwQsAAAAACRvem7Pfl5U1-ST3TDaJ3Frtvj8', { action: 'register' });

      if (!token) {
        showError(registerError, 'Błąd weryfikacji reCAPTCHA. Spróbuj ponownie.');
        registerSubmitBtn.disabled = false;
        registerSubmitBtn.textContent = 'Zarejestruj się';
        return;
      }

      registerSubmitBtn.textContent = 'Rejestracja...';
      const result = await registerUser(email, password, name);

      if (result.success) {
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        hideError(registerError);

        // Pokaż komunikat sukcesu
        const successMessage = document.createElement('div');
        successMessage.textContent = 'Konto utworzone pomyślnie! Sprawdź swoją skrzynkę email aby zweryfikować konto.';
        successMessage.style.cssText = 'padding: 0.75rem; margin: 0.75rem 0; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 0.5rem; color: #2e7d32; font-size: 0.9rem;';
        registerForm.insertBefore(successMessage, registerForm.firstChild);

        setTimeout(() => {
          successMessage.remove();
          loginForm.style.display = 'block';
          registerForm.style.display = 'none';
        }, 3000);
      } else {
        showError(registerError, result.error);
      }
    } catch (error) {
      console.error('Błąd reCAPTCHA:', error);
      showError(registerError, 'Błąd weryfikacji. Spróbuj ponownie.')
    }
    
    registerSubmitBtn.disabled = false;
    registerSubmitBtn.textContent = 'Zarejestruj się';
  });
}

// Wylogowanie (z modala uwierzytelniania)
if (authLogoutBtn) {
  authLogoutBtn.addEventListener('click', async () => {
    const result = await logoutUser();
    if (!result.success) {
      alert(result.error);
    }
  });
}

// Enter w formularzach
document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginSubmitBtn.click();
  }
});

document.getElementById('loginEmail')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginSubmitBtn.click();
  }
});

document.getElementById('registerConfirmPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    registerSubmitBtn.click();
  }
});

// Panel admina - używa hasła konta do autoryzacji
elements.adminBtn.addEventListener('click', () => {
  if (state.isLoggedIn) {
    adminModal.style.display = 'flex';
    renderAdminCategories();
    renderAdminRewards();
    renderChildrenList();
    initializeSortable();
    updateAdminHeaderInfo();
    renderCategorySuggestions();
    renderRewardSuggestions();
  } else {
    passwordModal.style.display = 'flex';
    adminPasswordInput.focus();
  }
});

submitPassword.addEventListener('click', async () => {
  const password = adminPasswordInput.value;
  
  if (!password) {
    alert('Podaj hasło!');
    return;
  }
  
  submitPassword.disabled = true;
  submitPassword.textContent = 'Sprawdzanie...';
  
  // Próba logowania do Firebase Auth z hasłem
  const user = getCurrentAuthUser();
  if (!user) {
    alert('Błąd: Musisz być zalogowany!');
    submitPassword.disabled = false;
    submitPassword.textContent = 'Zatwierdź';
    return;
  }
  
  const email = user.email;
  const result = await loginUser(email, password);
  
  if (result.success) {
    localStorage.setItem(state.ADMIN_FLAG, '1');
    setLoggedInUi(true);
    passwordModal.style.display = 'none';
    adminModal.style.display = 'flex';
    adminPasswordInput.value = '';
    renderAdminCategories();
    renderAdminRewards();
    renderChildrenList();
    initializeSortable();
    updateAdminHeaderInfo();
    renderCategorySuggestions();
    renderRewardSuggestions();
  } else {
    alert('Nieprawidłowe hasło!');
  }
  
  submitPassword.disabled = false;
  submitPassword.textContent = 'Zatwierdź';
});

adminPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitPassword.click();
  }
});

logoutBtn.addEventListener('click', () => {
  showLogoutConfirmModal(() => {
    localStorage.removeItem(state.ADMIN_FLAG);
    setLoggedInUi(false);
    adminModal.style.display = 'none';
  });
});

closeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
    adminModal.style.display = 'none';
    editModal.style.display = 'none';
    rankingModal.style.display = 'none';
    childModal.style.display = 'none';
    pendingRewardsModal.style.display = 'none';
    editRewardModal.style.display = 'none';
    resetRankingPasswordModal.style.display = 'none';
    resetRankingSuccessModal.style.display = 'none';
    deleteAccountPasswordModal.style.display = 'none';
    galleryModal.style.display = 'none';

    const rewardModal = document.getElementById('rewardModal');
    if (rewardModal && rewardModal.style.display === 'flex') {
      const closeBtn = rewardModal.querySelector('.close-btn');
      if (closeBtn && closeBtn.style.display !== 'none') {
        rewardModal.style.display = 'none';
      }
    }
  });
});

document.addEventListener('click', (e) => {
  const modals = [
    passwordModal,
    adminModal,
    editModal,
    rankingModal,
    childModal,
    pendingRewardsModal,
    editRewardModal,
    resetRankingPasswordModal,
    resetRankingSuccessModal,
    deleteAccountPasswordModal,
    galleryModal
  ];

  if (modals.includes(e.target)) {
    e.target.style.display = 'none';
  }

  const rewardModal = document.getElementById('rewardModal');
  if (e.target === rewardModal) {
    const closeBtn = rewardModal.querySelector('.close-btn');
    if (closeBtn && closeBtn.style.display !== 'none') {
      rewardModal.style.display = 'none';
    }
  }
});

addCategoryBtn.addEventListener('click', handleAddCategory);
saveEditBtn.addEventListener('click', handleSaveEdit);
addRewardBtn.addEventListener('click', handleAddReward);

// Event listenery dla modalu edycji nagrody
const saveRewardEditBtn = document.getElementById('saveRewardEditBtn');
const cancelRewardEditBtn = document.getElementById('cancelRewardEditBtn');
const editRewardProbability = document.getElementById('editRewardProbability');

if (saveRewardEditBtn) {
  saveRewardEditBtn.addEventListener('click', handleSaveRewardEdit);
}

if (cancelRewardEditBtn) {
  cancelRewardEditBtn.addEventListener('click', () => {
    const editRewardModal = document.getElementById('editRewardModal');
    editRewardModal.style.display = 'none';
    adminModal.style.display = 'flex';
  });
}

// Aktualizuj informacje o częstotliwości w czasie rzeczywistym
if (editRewardProbability) {
  editRewardProbability.addEventListener('input', () => {
    updateProbabilityInfo();
  });
}

backToAdminBtn.addEventListener('click', () => {
  editModal.style.display = 'none';
  adminModal.style.display = 'flex';
  renderAdminCategories();
  renderAdminRewards();
  renderChildrenList();
  initializeSortable();
  updateAdminHeaderInfo();
});

changePasswordBtn.addEventListener('click', async () => {
  const newPassword = document.getElementById('newPasswordInput').value;
  
  if (!newPassword) {
    alert('Podaj nowe hasło!');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('Hasło musi mieć co najmniej 6 znaków!');
    return;
  }
  
  changePasswordBtn.disabled = true;
  changePasswordBtn.textContent = 'Zmieniam...';
  
  try {
    await changeUserPassword(newPassword);
    alert('✅ Hasło do konta zostało zmienione!');
    document.getElementById('newPasswordInput').value = '';
  } catch (error) {
    let errorMessage = 'Błąd zmiany hasła!';
    
    if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Ze względów bezpieczeństwa musisz się ponownie zalogować przed zmianą hasła. Wyloguj się i zaloguj ponownie, a następnie spróbuj zmienić hasło.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków.';
    }
    
    alert('❌ ' + errorMessage);
  }
  
  changePasswordBtn.disabled = false;
  changePasswordBtn.textContent = 'Zmień';
});

if (setAvatarBtn) {
  setAvatarBtn.addEventListener('click', handleSetAvatar);
}

if (openGalleryBtn) {
  openGalleryBtn.addEventListener('click', openGalleryModal);
}

if (resetRankingBtn) {
  resetRankingBtn.addEventListener('click', handleResetRanking);
}

if (addChildBtn) {
  addChildBtn.addEventListener('click', openAddChildModal);
}

if (saveChildBtn) {
  saveChildBtn.addEventListener('click', handleSaveChild);
}

elements.rankingBtn.addEventListener('click', () => {
  displayRanking();
  rankingModal.style.display = 'flex';
});

if (pendingRewardsBtn) {
  pendingRewardsBtn.addEventListener('click', () => {
    displayPendingRewards();
    pendingRewardsModal.style.display = 'flex';
  });
}

// Mobile menu dropdown
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');
const adminBtnMobile = document.getElementById('adminBtnMobile');
const rankingBtnMobile = document.getElementById('rankingBtnMobile');
const pendingRewardsBtnMobile = document.getElementById('pendingRewardsBtnMobile');

if (mobileMenuBtn && mobileMenuDropdown) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    mobileMenuDropdown.classList.toggle('active');
  });

  // Zamknij dropdown po kliknięciu gdziekolwiek poza nim
  document.addEventListener('click', (e) => {
    if (!mobileMenuBtn.contains(e.target) && !mobileMenuDropdown.contains(e.target)) {
      mobileMenuBtn.classList.remove('active');
      mobileMenuDropdown.classList.remove('active');
    }
  });
}

if (adminBtnMobile) {
  adminBtnMobile.addEventListener('click', () => {
    mobileMenuDropdown.classList.remove('active');
    mobileMenuBtn.classList.remove('active');

    if (state.isLoggedIn) {
      adminModal.style.display = 'flex';
      renderAdminCategories();
      renderAdminRewards();
      renderChildrenList();
      initializeSortable();
      updateAdminHeaderInfo();
      renderCategorySuggestions();
      renderRewardSuggestions();
    } else {
      passwordModal.style.display = 'flex';
      adminPasswordInput.focus();
    }
  });
}

if (rankingBtnMobile) {
  rankingBtnMobile.addEventListener('click', () => {
    mobileMenuDropdown.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
    displayRanking();
    rankingModal.style.display = 'flex';
  });
}

if (pendingRewardsBtnMobile) {
  pendingRewardsBtnMobile.addEventListener('click', () => {
    mobileMenuDropdown.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
    displayPendingRewards();
    pendingRewardsModal.style.display = 'flex';
  });
}

// Reset rankingu - weryfikacja hasła i potwierdzenie
const resetRankingPasswordInput = document.getElementById('resetRankingPasswordInput');
const confirmResetRankingBtn = document.getElementById('confirmResetRankingBtn');
const closeResetSuccessBtn = document.getElementById('closeResetSuccessBtn');

if (confirmResetRankingBtn && resetRankingPasswordInput) {
  confirmResetRankingBtn.addEventListener('click', async () => {
    const password = resetRankingPasswordInput.value;
    const user = getCurrentAuthUser();

    if (!password) {
      alert('Wprowadź hasło!');
      return;
    }

    if (!user) {
      alert('Błąd: Nie jesteś zalogowany!');
      return;
    }

    confirmResetRankingBtn.disabled = true;
    confirmResetRankingBtn.textContent = 'Sprawdzanie...';

    const email = user.email;
    const result = await loginUser(email, password);

    if (result.success) {
      // Hasło poprawne - resetuj ranking
      confirmResetRankingBtn.textContent = 'Resetuję...';

      const success = await resetAllRankings();

      confirmResetRankingBtn.disabled = false;
      confirmResetRankingBtn.textContent = 'Resetuj ranking';
      resetRankingPasswordInput.value = '';
      resetRankingPasswordModal.style.display = 'none';

      if (success) {
        // Pokaż modal sukcesu
        resetRankingSuccessModal.style.display = 'flex';
      } else {
        alert('❌ Błąd podczas resetowania rankingu!');
      }
    } else {
      alert('❌ Nieprawidłowe hasło!');
      confirmResetRankingBtn.disabled = false;
      confirmResetRankingBtn.textContent = 'Resetuj ranking';
    }
  });

  // Enter w input hasła resetowania
  resetRankingPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmResetRankingBtn.click();
    }
  });
}

if (closeResetSuccessBtn) {
  closeResetSuccessBtn.addEventListener('click', () => {
    resetRankingSuccessModal.style.display = 'none';
  });
}

// ===== OBSŁUGA USUWANIA KONTA =====
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', () => {
    deleteAccountPasswordInput.value = '';
    adminModal.style.display = 'none';
    deleteAccountPasswordModal.style.display = 'flex';
    deleteAccountPasswordInput.focus();
  });
}

if (cancelDeleteAccountBtn) {
  cancelDeleteAccountBtn.addEventListener('click', () => {
    deleteAccountPasswordModal.style.display = 'none';
    adminModal.style.display = 'flex';
  });
}

if (confirmDeleteAccountBtn && deleteAccountPasswordInput) {
  confirmDeleteAccountBtn.addEventListener('click', async () => {
    const password = deleteAccountPasswordInput.value;
    const user = getCurrentAuthUser();

    if (!password) {
      alert('Wprowadź hasło!');
      return;
    }

    if (!user) {
      alert('Błąd: Musisz być zalogowany!');
      return;
    }

    // Potwierdzenie przed usunięciem
    const finalConfirm = confirm(
      '⚠️ OSTATECZNE OSTRZEŻENIE ⚠️\n\n' +
      'Czy na pewno chcesz usunąć swoje konto?\n\n' +
      'Zostaną usunięte:\n' +
      '• Twoje konto użytkownika\n' +
      '• Wszystkie profile dzieci\n' +
      '• Wszystkie kategorie i nagrody\n' +
      '• Cała historia i statystyki\n\n' +
      'Ta operacja jest NIEODWRACALNA!\n\n' +
      'Kliknij OK aby kontynuować lub Anuluj aby przerwać.'
    );

    if (!finalConfirm) {
      return;
    }

    confirmDeleteAccountBtn.disabled = true;
    confirmDeleteAccountBtn.textContent = 'Usuwanie...';

    try {
      // Najpierw zweryfikuj hasło przez próbę ponownego logowania
      const loginResult = await loginUser(user.email, password);

      if (!loginResult.success) {
        alert('❌ Nieprawidłowe hasło!');
        confirmDeleteAccountBtn.disabled = false;
        confirmDeleteAccountBtn.textContent = 'Usuń konto';
        return;
      }

      // Usuń wszystkie dane użytkownika z bazy danych
      const dataDeleted = await deleteAllUserData();

      if (!dataDeleted) {
        alert('❌ Błąd podczas usuwania danych!');
        confirmDeleteAccountBtn.disabled = false;
        confirmDeleteAccountBtn.textContent = 'Usuń konto';
        return;
      }

      // Usuń konto Firebase Auth
      const accountResult = await deleteUserAccount();

      if (accountResult.success) {
        deleteAccountPasswordModal.style.display = 'none';
        alert('✅ Twoje konto zostało usunięte.\n\nDziękujemy za korzystanie z aplikacji.');
        // Przekierowanie do strony logowania nastąpi automatycznie przez auth listener
      } else {
        alert(`❌ ${accountResult.error}`);
        confirmDeleteAccountBtn.disabled = false;
        confirmDeleteAccountBtn.textContent = 'Usuń konto';
      }
    } catch (error) {
      console.error('Błąd podczas usuwania konta:', error);
      alert('❌ Wystąpił błąd podczas usuwania konta!');
      confirmDeleteAccountBtn.disabled = false;
      confirmDeleteAccountBtn.textContent = 'Usuń konto';
    }
  });
}

// Automatyczne zarządzanie scrollowaniem body gdy modal jest otwarty
const setupModalScrollLock = () => {
  const checkModals = () => {
    const modals = document.querySelectorAll('.modal');
    const hasOpenModal = Array.from(modals).some(modal => {
      const computedDisplay = window.getComputedStyle(modal).display;
      return computedDisplay === 'flex' || computedDisplay === 'block';
    });

    if (hasOpenModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  };

  // Obserwuj zmiany stylów na wszystkich modalach
  const observer = new MutationObserver(checkModals);

  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['style']
    });
  });

  // Sprawdź na starcie
  checkModals();
};

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('maks-bg');

  if (localStorage.getItem(state.ADMIN_FLAG) === '1') {
    setLoggedInUi(true);
  }

  // Uruchom system blokowania scrollowania dla modali
  setupModalScrollLock();
});