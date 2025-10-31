// ===== OPERACJE NA BAZIE DANYCH =====
import { db } from './config.js';
import { ref, onValue, set, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getCurrentUser, setCategories, setRewards, setChildren, getCachedData, setCachedCategories, setCachedRewards } from './state.js';
import { renderCategories } from './ui.js';
import { getCurrentAuthUser } from './auth.js';
import { updatePassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Nasłuchiwanie zmian dzieci
export const listenChildren = () => {
  const childrenRef = ref(db, 'children');
  
  onValue(childrenRef, (snapshot) => {
    const data = snapshot.val();
    const arr = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    setChildren(arr);
    
    // Automatyczna aktualizacja przycisków użytkowników
    if (window.updateUserButtons) {
      window.updateUserButtons();
    }
  });
};

// Nasłuchiwanie zmian kategorii z cache
export const setupRealtimeListener = (user) => {
  const categoriesRef = ref(db, `users/${user}/categories`);
  
  const cached = getCachedData(user);
  if (cached.categories) {
    setCategories(cached.categories);
    requestAnimationFrame(() => renderCategories());
  }
  
  onValue(categoriesRef, (snapshot) => {
    const data = snapshot.val();
    const arr = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    setCachedCategories(user, arr);
    
    if (getCurrentUser() === user) {
      setCategories(arr);
      requestAnimationFrame(() => renderCategories());
    }
  });
};

// Nasłuchiwanie zmian nagród z cache
export const listenRewardsForUser = (user) => {
  const rewardsRef = ref(db, `users/${user}/rewards`);
  
  const cached = getCachedData(user);
  if (cached.rewards) {
    setRewards(cached.rewards);
  }
  
  onValue(rewardsRef, (snapshot) => {
    const data = snapshot.val();
    const arr = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    
    setCachedRewards(user, arr);
    
    if (getCurrentUser() === user) {
      setRewards(arr);
    }
  });
};

const showCooldownModal = (remainingSeconds) => {
  let modal = document.getElementById('cooldownModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cooldownModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 24rem; text-align: center; padding: 2rem;">
        <h2 style="margin-top: 0; font-size: 1.5rem;">⏳ Poczekaj chwilę!</h2>
        <p style="font-size: 1.1rem; margin: 1.5rem 0;">
          Możesz dodać kryształek dopiero za <strong id="cooldownSeconds">${remainingSeconds}</strong> sekund.
        </p>
        <button id="cooldownOkBtn" class="submit-btn" style="margin-top: 1rem;">OK, rozumiem</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    const okBtn = modal.querySelector('#cooldownOkBtn');
    okBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
      }
    });
  } else {
    modal.style.display = 'flex';
    const secondsSpan = modal.querySelector('#cooldownSeconds');
    if (secondsSpan) {
      secondsSpan.textContent = remainingSeconds;
    }
  }
  
  const interval = setInterval(() => {
    remainingSeconds--;
    const secondsSpan = modal.querySelector('#cooldownSeconds');
    if (secondsSpan) {
      secondsSpan.textContent = remainingSeconds;
    }
    
    if (remainingSeconds <= 0) {
      clearInterval(interval);
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    }
  }, 1000);
};

const checkCooldown = async (categoryId) => {
  const user = getCurrentUser();
  const lastAddRef = ref(db, `users/${user}/categories/${categoryId}/lastAddTimestamp`);
  
  try {
    const snapshot = await get(lastAddRef);
    const lastAddTime = snapshot.exists() ? snapshot.val() : 0;
    const now = Date.now();
    const timeDiff = now - lastAddTime;
    const cooldownMs = 30000;
    
    if (timeDiff < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeDiff) / 1000);
      showCooldownModal(remainingSeconds);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Błąd sprawdzania cooldown:', error);
    return true;
  }
};

export const addCrystal = async (categoryId) => {
  const canAdd = await checkCooldown(categoryId);
  if (!canAdd) {
    return false;
  }
  
  const user = getCurrentUser();
  const countRef = ref(db, `users/${user}/categories/${categoryId}/count`);
  
  try {
    const snapshot = await get(countRef);
    const currentCount = snapshot.exists() ? snapshot.val() : 0;
    
    const updates = {};
    updates[`users/${user}/categories/${categoryId}/count`] = currentCount + 1;
    updates[`users/${user}/categories/${categoryId}/lastAddTimestamp`] = Date.now();
    
    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Błąd dodawania kryształka:', error);
    return false;
  }
};

export const resetCategory = async (categoryId) => {
  const user = getCurrentUser();
  
  try {
    const { generateCategoryColors } = await import('./state.js');
    const colors = generateCategoryColors();
    
    const updates = {};
    updates[`users/${user}/categories/${categoryId}/count`] = 0;
    updates[`users/${user}/categories/${categoryId}/pendingReset`] = null;
    updates[`users/${user}/categories/${categoryId}/lastReward`] = null;
    updates[`users/${user}/categories/${categoryId}/lastAddTimestamp`] = null;
    updates[`users/${user}/categories/${categoryId}/color`] = colors.color;
    updates[`users/${user}/categories/${categoryId}/borderColor`] = colors.borderColor;
    await update(ref(db), updates);
  } catch (error) {
    console.error('Błąd resetowania kategorii:', error);
  }
};

export const addCategory = async (name) => {
  const user = getCurrentUser();
  const categoriesRef = ref(db, `users/${user}/categories`);
  
  try {
    const snapshot = await get(categoriesRef);
    const data = snapshot.val() || {};
    const maxOrder = Object.values(data).reduce((max, cat) => 
      Math.max(max, cat.order || 0), 0);
    
    const newId = Date.now().toString();
    
    const { generateCategoryColors } = await import('./state.js');
    const colors = generateCategoryColors();
    
    const newCategory = {
      name,
      goal: 10,
      count: 0,
      color: colors.color,
      borderColor: colors.borderColor,
      image: '',
      order: maxOrder + 1,
      lastAddTimestamp: 0
    };
    
    await set(ref(db, `users/${user}/categories/${newId}`), newCategory);
    return true;
  } catch (error) {
    console.error('Błąd dodawania kategorii:', error);
    return false;
  }
};

export const deleteCategory = async (categoryId) => {
  const user = getCurrentUser();
  
  try {
    await remove(ref(db, `users/${user}/categories/${categoryId}`));
    return true;
  } catch (error) {
    console.error('Błąd usuwania kategorii:', error);
    return false;
  }
};

export const updateCategory = async (categoryId, data) => {
  const user = getCurrentUser();
  
  try {
    if (data.goal !== undefined) {
      const categoryRef = ref(db, `users/${user}/categories/${categoryId}`);
      const snapshot = await get(categoryRef);
      
      if (snapshot.exists()) {
        const currentData = snapshot.val();
        const currentCount = currentData.count || 0;
        const newGoal = data.goal;
        const maxAllowedCount = newGoal - 1;
        
        if (currentCount > maxAllowedCount) {
          data.count = maxAllowedCount;
        }
      }
    }
    
    await update(ref(db, `users/${user}/categories/${categoryId}`), data);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji kategorii:', error);
    return false;
  }
};

export const updateCategoryOrder = async (categoryId, newOrder) => {
  const user = getCurrentUser();
  
  try {
    await set(ref(db, `users/${user}/categories/${categoryId}/order`), newOrder);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji kolejności:', error);
    return false;
  }
};

export const modifyCrystalCount = async (categoryId, delta) => {
  const user = getCurrentUser();
  const categoryRef = ref(db, `users/${user}/categories/${categoryId}`);
  
  try {
    const snapshot = await get(categoryRef);
    if (!snapshot.exists()) return false;
    
    const category = snapshot.val();
    const currentCount = category.count || 0;
    const goal = category.goal || 10;
    const maxAllowedCount = goal - 1;
    
    let newCount = currentCount + delta;
    newCount = Math.max(0, Math.min(newCount, maxAllowedCount));
    
    await set(ref(db, `users/${user}/categories/${categoryId}/count`), newCount);
    return true;
  } catch (error) {
    console.error('Błąd modyfikacji kryształków:', error);
    return false;
  }
};

export const resetAllRankings = async () => {
  try {
    const childrenSnapshot = await get(ref(db, 'children'));
    const children = childrenSnapshot.exists() ? childrenSnapshot.val() : {};
    
    for (const childId in children) {
      const categoriesRef = ref(db, `users/${childId}/categories`);
      const snapshot = await get(categoriesRef);
      
      if (snapshot.exists()) {
        const categories = snapshot.val();
        const updates = {};
        
        for (const catId in categories) {
          updates[`users/${childId}/categories/${catId}/wins`] = null;
        }
        
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Błąd resetowania rankingów:', error);
    return false;
  }
};

export const addReward = async (name, image = '') => {
  const user = getCurrentUser();
  const newId = Date.now().toString();
  
  try {
    await set(ref(db, `users/${user}/rewards/${newId}`), { name, image });
    return true;
  } catch (error) {
    console.error('Błąd dodawania nagrody:', error);
    return false;
  }
};

export const deleteReward = async (rewardId) => {
  const user = getCurrentUser();
  
  try {
    await remove(ref(db, `users/${user}/rewards/${rewardId}`));
    return true;
  } catch (error) {
    console.error('Błąd usuwania nagrody:', error);
    return false;
  }
};

export const updateReward = async (rewardId, data) => {
  const user = getCurrentUser();
  
  try {
    await update(ref(db, `users/${user}/rewards/${rewardId}`), data);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji nagrody:', error);
    return false;
  }
};

export const changeAdminPassword = async (newPasswordHash) => {
  try {
    await set(ref(db, 'adminPasswordHash'), newPasswordHash);
    return true;
  } catch (error) {
    console.error('Błąd zmiany hasła:', error);
    return false;
  }
};

export const getAdminPasswordHash = async () => {
  try {
    const snapshot = await get(ref(db, 'adminPasswordHash'));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    return null;
  }
};

// Zmiana hasła użytkownika (Firebase Auth)
export const changeUserPassword = async (newPassword) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error('Błąd zmiany hasła użytkownika:', error);
    throw error;
  }
};

export const setAvatar = async (user, url) => {
  try {
    await set(ref(db, `users/${user}/profile/avatarUrl`), url);
    return true;
  } catch (error) {
    console.error('Błąd ustawiania avatara:', error);
    return false;
  }
};

export const getAvatar = (user, callback) => {
  const avatarRef = ref(db, `users/${user}/profile/avatarUrl`);
  
  onValue(avatarRef, (snapshot) => {
    const url = snapshot.val() || '';
    callback(url);
  });
};

export const finalizeReward = async (categoryId, rewardName) => {
  const user = getCurrentUser();
  
  try {
    const winsRef = ref(db, `users/${user}/categories/${categoryId}/wins/${user}`);
    const snapshot = await get(winsRef);
    const currentWins = snapshot.exists() ? snapshot.val() : 0;
    
    const updates = {};
    updates[`users/${user}/categories/${categoryId}/wins/${user}`] = currentWins + 1;
    updates[`users/${user}/categories/${categoryId}/lastReward`] = rewardName;
    updates[`users/${user}/categories/${categoryId}/pendingReset`] = true;
    
    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Błąd finalizacji nagrody:', error);
    return false;
  }
};

// Zarządzanie dziećmi
export const addChild = async (name, gender) => {
  try {
    const childrenRef = ref(db, 'children');
    const snapshot = await get(childrenRef);
    const data = snapshot.val() || {};
    const maxOrder = Object.values(data).reduce((max, child) => 
      Math.max(max, child.order || 0), 0);
    
    const newId = Date.now().toString();
    
    const newChild = {
      name,
      gender,
      order: maxOrder + 1
    };
    
    await set(ref(db, `children/${newId}`), newChild);
    return true;
  } catch (error) {
    console.error('Błąd dodawania dziecka:', error);
    return false;
  }
};

export const updateChild = async (childId, data) => {
  try {
    await update(ref(db, `children/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji dziecka:', error);
    return false;
  }
};

export const deleteChild = async (childId) => {
  try {
    // Usuwamy dziecko z listy children
    await remove(ref(db, `children/${childId}`));
    
    // Usuwamy wszystkie dane użytkownika (kategorie, nagrody, ranking itp.)
    await remove(ref(db, `users/${childId}`));
    
    return true;
  } catch (error) {
    console.error('Błąd usuwania dziecka:', error);
    return false;
  }
};