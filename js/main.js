// ===== GŁÓWNY PLIK APLIKACJI =====
import { state, setCurrentUser, sha256 } from './state.js';
import { 
  setupRealtimeListener, 
  listenRewardsForUser,
  getAdminPasswordHash,
  changeAdminPassword
} from './database.js';
import { 
  elements, 
  switchUser, 
  loadAvatar, 
  displayRanking 
} from './ui.js';
import { 
  initializeSortable,
  renderAdminCategories,
  renderAdminRewards,
  handleAddCategory,
  handleSaveEdit,
  setLoggedInUi,
  handleAddReward,
  handleSetAvatar
} from './admin.js';
import { getAvatar } from './database.js';

// ===== ELEMENTY DOM =====
const passwordModal = document.getElementById('passwordModal');
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const rankingModal = document.getElementById('rankingModal');

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

// ===== OBSŁUGA PRZYCISKÓW UŻYTKOWNIKA =====
elements.maksBtn.addEventListener('click', () => {
  setCurrentUser('maks');
  switchUser('maks', setupRealtimeListener, listenRewardsForUser);
});

elements.ninaBtn.addEventListener('click', () => {
  setCurrentUser('nina');
  switchUser('nina', setupRealtimeListener, listenRewardsForUser);
});

// ===== OBSŁUGA PANELU ADMINA =====
elements.adminBtn.addEventListener('click', () => {
  if (state.isLoggedIn) {
    // Jeśli zalogowany, otwórz panel
    adminModal.style.display = 'flex';
    renderAdminCategories();
    renderAdminRewards();
    initializeSortable();
  } else {
    // Jeśli nie zalogowany, pokaż formularz hasła
    passwordModal.style.display = 'flex';
    adminPasswordInput.focus();
  }
});

// ===== LOGOWANIE DO PANELU ADMINA =====
submitPassword.addEventListener('click', async () => {
  const password = adminPasswordInput.value;
  
  if (!password) {
    alert('Podaj hasło!');
    return;
  }
  
  const hash = await sha256(password);
  
  // Sprawdź najpierw lokalny hash, potem spróbuj Firebase (jeśli są uprawnienia)
  let storedHash = state.ADMIN_HASH;
  try {
    const firebaseHash = await getAdminPasswordHash();
    if (firebaseHash) {
      storedHash = firebaseHash;
    }
  } catch (error) {
    // Brak uprawnień do Firebase - używamy lokalnego hasha
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
    initializeSortable();
  } else {
    alert('Nieprawidłowe hasło!');
  }
});

// Enter w polu hasła
adminPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitPassword.click();
  }
});

// ===== WYLOGOWANIE =====
logoutBtn.addEventListener('click', () => {
  const sure = confirm('Na pewno wylogować z panelu admina?');
  
  if (!sure) return;
  
  localStorage.removeItem(state.ADMIN_FLAG);
  setLoggedInUi(false);
  adminModal.style.display = 'none';
});

// ===== ZAMYKANIE MODALÓW =====
closeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
    adminModal.style.display = 'none';
    editModal.style.display = 'none';
    rankingModal.style.display = 'none';
    document.getElementById('rewardModal').style.display = 'none';
  });
});

// Kliknięcie poza modalem
document.addEventListener('click', (e) => {
  const modals = [
    passwordModal, 
    adminModal, 
    editModal, 
    rankingModal,
    document.getElementById('rewardModal')
  ];
  
  if (modals.includes(e.target)) {
    e.target.style.display = 'none';
  }
});

// ===== PRZYCISKI PANELU ADMINA =====
addCategoryBtn.addEventListener('click', handleAddCategory);
saveEditBtn.addEventListener('click', handleSaveEdit);
addRewardBtn.addEventListener('click', handleAddReward);

backToAdminBtn.addEventListener('click', () => {
  editModal.style.display = 'none';
  adminModal.style.display = 'flex';
  renderAdminCategories();
  renderAdminRewards();
  initializeSortable();
});

// ===== ZMIANA HASŁA =====
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

// ===== USTAWIENIE AVATARA =====
setAvatarMaksBtn.addEventListener('click', () => handleSetAvatar('maks'));
setAvatarNinaBtn.addEventListener('click', () => handleSetAvatar('nina'));

// ===== RANKING =====
elements.rankingBtn.addEventListener('click', () => {
  displayRanking();
  rankingModal.style.display = 'flex';
});

// ===== INICJALIZACJA APLIKACJI =====
document.addEventListener('DOMContentLoaded', () => {
  // Ustaw domyślne tło dla Maksa
  document.body.classList.add('maks-bg');
  
  // Sprawdź czy użytkownik jest zalogowany
  if (localStorage.getItem(state.ADMIN_FLAG) === '1') {
    setLoggedInUi(true);
  }
  
  // Załaduj avatary
  loadAvatar('maks', elements.maksAvatar, getAvatar);
  loadAvatar('nina', elements.ninaAvatar, getAvatar);
  
  // Rozpocznij nasłuchiwanie zmian dla domyślnego użytkownika
  setupRealtimeListener(state.currentUser);
  listenRewardsForUser(state.currentUser);
});