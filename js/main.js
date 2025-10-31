// ===== GŁÓWNY PLIK APLIKACJI =====
import { state, setCurrentUser, sha256 } from './state.js';
import { 
  setupRealtimeListener, 
  listenRewardsForUser,
  getAdminPasswordHash,
  changeAdminPassword,
  listenChildren
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
  openAddChildModal
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

window.updateUserButtons = updateUserButtons;

// Obsługa uwierzytelniania
setupAuthListener((user) => {
  if (user) {
    // Użytkownik zalogowany
    authModal.style.display = 'none';
    document.querySelector('.crystal-app').style.display = 'flex';
    document.getElementById('userEmail').textContent = user.email;
    
    // Sprawdź czy są dzieci i kategorie
    checkEmptyStates();
  } else {
    // Użytkownik niezalogowany
    authModal.style.display = 'flex';
    document.querySelector('.crystal-app').style.display = 'none';
  }
});

const checkEmptyStates = () => {
  setTimeout(() => {
    showEmptyStateGuide();
  }, 500);
};

// Przełączanie między logowaniem a rejestracją
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });
}

if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });
}

// Logowanie
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      alert('Podaj email i hasło!');
      return;
    }
    
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Logowanie...';
    
    const result = await loginUser(email, password);
    
    if (result.success) {
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
    } else {
      alert(result.error);
    }
    
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Zaloguj się';
  });
}

// Rejestracja
if (registerSubmitBtn) {
  registerSubmitBtn.addEventListener('click', async () => {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
      alert('Wypełnij wszystkie pola!');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Hasła nie są identyczne!');
      return;
    }
    
    if (password.length < 6) {
      alert('Hasło musi mieć co najmniej 6 znaków!');
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
      alert('Konto utworzone! Możesz się teraz zalogować.');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      alert(result.error);
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

document.getElementById('registerConfirmPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    registerSubmitBtn.click();
  }
});

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
  
  const hash = await sha256(password);
  
  let storedHash = state.ADMIN_HASH;
  try {
    const firebaseHash = await getAdminPasswordHash();
    if (firebaseHash) {
      storedHash = firebaseHash;
    }
  } catch (error) {
    console.log('Używam lokalnego hasła (brak dostępu do Firebase)');
  }
  
  if (hash === storedHash) {
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
});

adminPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitPassword.click();
  }
});

logoutBtn.addEventListener('click', () => {
  const sure = confirm('Na pewno wylogować z panelu admina?');
  
  if (!sure) return;
  
  localStorage.removeItem(state.ADMIN_FLAG);
  setLoggedInUi(false);
  adminModal.style.display = 'none';
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
  
  const hash = await sha256(newPassword);
  const success = await changeAdminPassword(hash);
  
  if (success) {
    alert('Hasło zostało zmienione!');
    document.getElementById('newPasswordInput').value = '';
  } else {
    alert('Błąd zmiany hasła!');
  }
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
  
  listenChildren();
  
  setTimeout(() => {
    updateUserButtons();
    
    setupRealtimeListener(state.currentUser);
    listenRewardsForUser(state.currentUser);
  }, 100);
});