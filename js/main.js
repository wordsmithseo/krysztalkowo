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
  updateUserButtons
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

const passwordModal = document.getElementById('passwordModal');
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const rankingModal = document.getElementById('rankingModal');
const childModal = document.getElementById('childModal');

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

window.updateUserButtons = updateUserButtons;

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