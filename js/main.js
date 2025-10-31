// ===== GŁÓWNY PLIK APLIKACJI =====
import { state, setCurrentUser } from './state.js';
import { 
  setupRealtimeListener, 
  listenRewardsForUser,
  listenChildren,
  changeUserPassword
} from './database.js';
import { 
  elements, 
  switchUser, 
  loadAvatar, 
  displayRanking,
  updateUserButtons,
  showEmptyStateGuide
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
  showLogoutConfirmModal
} from './admin.js';
import { getAvatar } from './database.js';
import { setupAuthListener, loginUser, registerUser, logoutUser, getCurrentAuthUser } from './auth.js';

const passwordModal = document.getElementById('passwordModal');
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const rankingModal = document.getElementById('rankingModal');
const childModal = document.getElementById('childModal');
const authModal = document.getElementById('authModal');

const adminPasswordInput = document.getElementById('adminPasswordInput');
const submitPassword = document.getElementById('submitPassword');
const logoutBtn = document.getElementById('logoutBtn');
const closeButtons = document.querySelectorAll('.close-btn');

const addCategoryBtn = document.getElementById('addCategoryBtn');
const saveEditBtn = document.getElementById('saveEditBtn');
const backToAdminBtn = document.getElementById('backToAdminBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const addRewardBtn = document.getElementById('addRewardBtn');
const setAvatarMaksBtn = document.getElementById('setAvatarMaksBtn');
const setAvatarNinaBtn = document.getElementById('setAvatarNinaBtn');
const resetRankingBtn = document.getElementById('resetRankingBtn');
const addChildBtn = document.getElementById('addChildBtn');
const saveChildBtn = document.getElementById('saveChildBtn');

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

// Obsługa uwierzytelniania
setupAuthListener((user) => {
  if (user) {
    // Użytkownik zalogowany - ukryj modal i pokaż aplikację
    authModal.style.display = 'none';
    document.querySelector('.crystal-app').style.display = 'flex';
    document.getElementById('userEmail').textContent = user.email;
    
    // Inicjalizacja nasłuchiwania zmian
    listenChildren();
    
    // Poczekaj na załadowanie dzieci
    setTimeout(() => {
      updateUserButtons();
      checkEmptyStates();
      
      // Ustaw pierwszego użytkownika i nasłuchuj zmian
      const children = state.children;
      if (children.length > 0) {
        setCurrentUser(children[0].id);
        setupRealtimeListener(children[0].id);
        listenRewardsForUser(children[0].id);
      }
    }, 500);
  } else {
    // Użytkownik niezalogowany - pokaż modal uwierzytelniania
    authModal.style.display = 'flex';
    document.querySelector('.crystal-app').style.display = 'none';
  }
});

const checkEmptyStates = () => {
  showEmptyStateGuide();
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
    loginSubmitBtn.textContent = 'Logowanie...';
    
    const result = await loginUser(email, password);
    
    if (result.success) {
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
      hideError(loginError);
    } else {
      showError(loginError, result.error);
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
      successMessage.textContent = 'Konto utworzone pomyślnie! Możesz się teraz zalogować.';
      successMessage.style.cssText = 'padding: 0.75rem; margin: 0.75rem 0; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 0.5rem; color: #2e7d32; font-size: 0.9rem;';
      registerForm.insertBefore(successMessage, registerForm.firstChild);
      
      setTimeout(() => {
        successMessage.remove();
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      }, 2000);
    } else {
      showError(registerError, result.error);
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
    childModal
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

backToAdminBtn.addEventListener('click', () => {
  editModal.style.display = 'none';
  adminModal.style.display = 'flex';
  renderAdminCategories();
  renderAdminRewards();
  renderChildrenList();
  initializeSortable();
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

if (setAvatarMaksBtn) {
  setAvatarMaksBtn.addEventListener('click', () => handleSetAvatar('maks'));
}
if (setAvatarNinaBtn) {
  setAvatarNinaBtn.addEventListener('click', () => handleSetAvatar('nina'));
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

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('maks-bg');
  
  if (localStorage.getItem(state.ADMIN_FLAG) === '1') {
    setLoggedInUi(true);
  }
});