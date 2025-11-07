// ===== OPERACJE NA BAZIE DANYCH =====
import { db } from './config.js';
import { ref, onValue, set, get, update, remove, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getCurrentUser, setCategories, setRewards, setChildren, getCachedData, setCachedCategories, setCachedRewards } from './state.js';
import { renderCategories } from './ui.js';
import { getCurrentAuthUser } from './auth.js';
import { updatePassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Nasłuchiwanie zmian dzieci
export const listenChildren = () => {
  const user = getCurrentAuthUser();
  if (!user) {
    console.error('Użytkownik nie jest zalogowany');
    setChildren([]);
    return;
  }

  console.log(`[listenChildren] Zalogowany użytkownik: ${user.uid}`);
  const childrenRef = ref(db, 'children');

  onValue(childrenRef, async (snapshot) => {
    const data = snapshot.val();
    const allChildren = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];

    console.log(`[listenChildren] Znaleziono ${allChildren.length} dzieci w bazie danych`);
    console.log('[listenChildren] Wszystkie dzieci:', allChildren);

    // MIGRACJA: Automatycznie przypisz dzieci bez userId do pierwszego zalogowanego użytkownika
    // To zapewnia kompatybilność wsteczną ze starymi danymi
    const childrenWithoutUserId = allChildren.filter(child => !child.userId);

    if (childrenWithoutUserId.length > 0) {
      console.log(`🔄 MIGRACJA: znaleziono ${childrenWithoutUserId.length} dzieci bez userId`);
      console.log('🔄 MIGRACJA: dzieci do migracji:', childrenWithoutUserId);
      console.log(`🔄 MIGRACJA: przypisywanie do użytkownika ${user.uid}...`);

      // Przypisz wszystkie dzieci bez userId do tego użytkownika
      const migrationPromises = childrenWithoutUserId.map(child => {
        console.log(`🔄 MIGRACJA: przypisywanie dziecka ${child.id} (${child.name || 'bez nazwy'})`);
        return update(ref(db, `children/${child.id}`), { userId: user.uid });
      });

      try {
        await Promise.all(migrationPromises);
        console.log('✅ MIGRACJA zakończona pomyślnie!');
        // Funkcja zostanie wywołana ponownie automatycznie przez onValue
      } catch (error) {
        console.error('❌ MIGRACJA: Błąd podczas migracji:', error);
      }

      return; // Funkcja zostanie wywołana ponownie po aktualizacji
    }

    // Filtruj dzieci należące do aktualnie zalogowanego użytkownika
    const userChildren = allChildren.filter(child => child.userId === user.uid);

    console.log(`[listenChildren] Dzieci użytkownika ${user.uid}:`, userChildren.length);
    if (userChildren.length === 0 && allChildren.length > 0) {
      console.warn('⚠️ UWAGA: W bazie są dzieci, ale żadne nie należy do tego użytkownika!');
      console.warn('⚠️ Wszystkie dzieci w bazie:', allChildren);
    }

    userChildren.sort((a, b) => (a.order || 0) - (b.order || 0));
    setChildren(userChildren);

    // Automatyczna aktualizacja przycisków użytkowników
    if (window.updateUserButtons) {
      window.updateUserButtons();
    }
  });
};

// Przechowywanie aktywnych listenerów
let activeListeners = [];

// Czyszczenie wszystkich aktywnych listenerów
const clearAllListeners = () => {
  activeListeners.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  activeListeners = [];
};

// Nasłuchiwanie zmian dla wszystkich dzieci (potrzebne do rankingu)
export const listenAllChildrenData = async (childrenList) => {
  // Wyczyść stare listenery przed utworzeniem nowych
  clearAllListeners();

  // Najpierw pobierz wszystkie dane jednorazowo aby wypełnić cache
  const loadPromises = childrenList.map(async (child) => {
    // Pobierz kategorie
    const categoriesRef = ref(db, `users/${child.id}/categories`);
    const categoriesSnapshot = await get(categoriesRef);
    const categoriesData = categoriesSnapshot.val();
    const categoriesArr = categoriesData ? Object.keys(categoriesData).map(id => ({ id, ...categoriesData[id] })) : [];
    categoriesArr.sort((a, b) => (a.order || 0) - (b.order || 0));
    setCachedCategories(child.id, categoriesArr);

    // Pobierz nagrody
    const rewardsRef = ref(db, `users/${child.id}/rewards`);
    const rewardsSnapshot = await get(rewardsRef);
    const rewardsData = rewardsSnapshot.val();
    const rewardsArr = rewardsData ? Object.keys(rewardsData).map(id => ({ id, ...rewardsData[id] })) : [];
    setCachedRewards(child.id, rewardsArr);
  });

  // Poczekaj aż wszystkie dane się załadują
  await Promise.all(loadPromises);

  // Teraz ustaw nasłuchiwanie na zmiany w czasie rzeczywistym
  childrenList.forEach(child => {
    // Nasłuchuj kategorii dla każdego dziecka
    const categoriesRef = ref(db, `users/${child.id}/categories`);
    const categoriesUnsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const arr = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
      arr.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Zapisz do cache dla tego dziecka
      setCachedCategories(child.id, arr);

      // Jeśli to aktualnie wybrane dziecko, zaktualizuj główny stan
      if (getCurrentUser() === child.id) {
        setCategories(arr);
        requestAnimationFrame(() => renderCategories());
      }
    });
    activeListeners.push(categoriesUnsubscribe);

    // Nasłuchuj nagród dla każdego dziecka
    const rewardsRef = ref(db, `users/${child.id}/rewards`);
    const rewardsUnsubscribe = onValue(rewardsRef, (snapshot) => {
      const data = snapshot.val();
      const arr = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];

      // Zapisz do cache dla tego dziecka
      setCachedRewards(child.id, arr);

      // Jeśli to aktualnie wybrane dziecko, zaktualizuj główny stan
      if (getCurrentUser() === child.id) {
        setRewards(arr);
      }
    });
    activeListeners.push(rewardsUnsubscribe);
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

export const addReward = async (name, image = '', probability = 50) => {
  const user = getCurrentUser();
  const newId = Date.now().toString();

  try {
    await set(ref(db, `users/${user}/rewards/${newId}`), { name, image, probability });
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

// Oznacz kategorię jako oczekującą na reset (gdy modal się otwiera)
export const markCategoryPendingReset = async (categoryId) => {
  const user = getCurrentUser();

  try {
    const updates = {};
    updates[`users/${user}/categories/${categoryId}/pendingReset`] = true;

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Błąd oznaczania kategorii jako pendingReset:', error);
    return false;
  }
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

// Dodawanie nagrody do zaległych
export const addPendingReward = async (categoryId, categoryName, rewardName) => {
  const user = getCurrentUser();
  const authUser = getCurrentAuthUser();

  if (!authUser) {
    console.error('Użytkownik nie jest zalogowany');
    return false;
  }

  try {
    const pendingRewardsRef = ref(db, 'pendingRewards');
    const newRewardRef = push(pendingRewardsRef);

    await set(newRewardRef, {
      childId: user,
      categoryId,
      categoryName,
      rewardName,
      userId: authUser.uid,
      timestamp: Date.now()
    });

    // Finalizuj nagrodę w kategorii i usuń pendingReset
    const winsRef = ref(db, `users/${user}/categories/${categoryId}/wins/${user}`);
    const snapshot = await get(winsRef);
    const currentWins = snapshot.exists() ? snapshot.val() : 0;

    const updates = {};
    updates[`users/${user}/categories/${categoryId}/wins/${user}`] = currentWins + 1;
    updates[`users/${user}/categories/${categoryId}/lastReward`] = rewardName;
    updates[`users/${user}/categories/${categoryId}/pendingReset`] = null; // Usuń flagę, nagroda zapisana jako zaległa
    updates[`users/${user}/categories/${categoryId}/count`] = 0; // Zresetuj licznik kryształków
    updates[`users/${user}/categories/${categoryId}/lastAddTimestamp`] = null; // Zresetuj cooldown

    // Wygeneruj nowe kolory dla karty
    const { generateCategoryColors } = await import('./state.js');
    const colors = generateCategoryColors();
    updates[`users/${user}/categories/${categoryId}/color`] = colors.color;
    updates[`users/${user}/categories/${categoryId}/borderColor`] = colors.borderColor;

    await update(ref(db), updates);

    return true;
  } catch (error) {
    console.error('Błąd dodawania zaległej nagrody:', error);
    return false;
  }
};

// Pobieranie zaległych nagród
export const getPendingRewards = async () => {
  const authUser = getCurrentAuthUser();

  if (!authUser) {
    console.error('Użytkownik nie jest zalogowany');
    return [];
  }

  try {
    const pendingRewardsRef = ref(db, 'pendingRewards');
    const snapshot = await get(pendingRewardsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const allRewards = Object.keys(data).map(id => ({
      id,
      ...data[id]
    }));

    // Filtruj nagrody należące do tego użytkownika
    const userRewards = allRewards.filter(reward => reward.userId === authUser.uid);

    // Sortuj od najstarszych
    userRewards.sort((a, b) => a.timestamp - b.timestamp);

    return userRewards;
  } catch (error) {
    console.error('Błąd pobierania zaległych nagród:', error);
    return [];
  }
};

// Realizacja zaległej nagrody
export const completePendingReward = async (rewardId) => {
  try {
    await remove(ref(db, `pendingRewards/${rewardId}`));
    return true;
  } catch (error) {
    console.error('Błąd realizacji zaległej nagrody:', error);
    return false;
  }
};

// Zarządzanie dziećmi
export const addChild = async (name, gender) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return false;
    }

    const childrenRef = ref(db, 'children');
    const snapshot = await get(childrenRef);
    const data = snapshot.val() || {};

    // Oblicz maksymalną kolejność tylko dla dzieci tego użytkownika
    const userChildren = Object.values(data).filter(child => child.userId === user.uid);
    const maxOrder = userChildren.reduce((max, child) =>
      Math.max(max, child.order || 0), 0);

    const newId = Date.now().toString();

    const newChild = {
      name,
      gender,
      order: maxOrder + 1,
      userId: user.uid  // Dodano powiązanie z użytkownikiem
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
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return false;
    }

    // Sprawdź czy dziecko należy do tego użytkownika
    const childRef = ref(db, `children/${childId}`);
    const snapshot = await get(childRef);
    const childData = snapshot.val();

    if (!childData || childData.userId !== user.uid) {
      console.error('Brak uprawnień do modyfikacji tego dziecka');
      return false;
    }

    await update(ref(db, `children/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji dziecka:', error);
    return false;
  }
};

export const updateChildOrder = async (childId, newOrder) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return false;
    }

    // Sprawdź czy dziecko należy do tego użytkownika
    const childRef = ref(db, `children/${childId}`);
    const snapshot = await get(childRef);
    const childData = snapshot.val();

    if (!childData || childData.userId !== user.uid) {
      console.error('Brak uprawnień do zmiany kolejności tego dziecka');
      return false;
    }

    await set(ref(db, `children/${childId}/order`), newOrder);
    return true;
  } catch (error) {
    console.error('Błąd aktualizacji kolejności dziecka:', error);
    return false;
  }
};

export const deleteChild = async (childId) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return false;
    }

    // Sprawdź czy dziecko należy do tego użytkownika
    const childRef = ref(db, `children/${childId}`);
    const snapshot = await get(childRef);
    const childData = snapshot.val();

    if (!childData || childData.userId !== user.uid) {
      console.error('Brak uprawnień do usunięcia tego dziecka');
      return false;
    }

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

// Funkcja sprawdzająca czy URL to Firebase Storage
const isFirebaseStorageUrl = (url) => {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebase');
};

// Pobierz sugestie kategorii z innych dzieci (tylko tego samego użytkownika, tylko Firebase Storage)
export const getSuggestedCategories = async (currentChildId) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return [];
    }

    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    if (!childrenData) return [];

    const suggestions = new Map(); // Używamy Map aby uniknąć duplikatów

    // Przeiteruj po wszystkich dzieciach TEGO użytkownika
    for (const childId in childrenData) {
      const child = childrenData[childId];

      // Pomiń dzieci innych użytkowników i aktualne dziecko
      if (child.userId !== user.uid || childId === currentChildId) continue;

      // Pobierz kategorie tego dziecka
      const categoriesRef = ref(db, `users/${childId}/categories`);
      const categoriesSnapshot = await get(categoriesRef);
      const categoriesData = categoriesSnapshot.val();

      if (categoriesData) {
        Object.values(categoriesData).forEach(cat => {
          // Tylko kategorie z Firebase Storage
          if (cat.name && !suggestions.has(cat.name) && isFirebaseStorageUrl(cat.image)) {
            suggestions.set(cat.name, {
              name: cat.name,
              goal: cat.goal || 10,
              image: cat.image
            });
          }
        });
      }
    }

    return Array.from(suggestions.values());
  } catch (error) {
    console.error('Błąd pobierania sugestii kategorii:', error);
    return [];
  }
};

// Pobierz sugestie nagród z innych dzieci (tylko tego samego użytkownika, tylko Firebase Storage)
export const getSuggestedRewards = async (currentChildId) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return [];
    }

    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    if (!childrenData) return [];

    const suggestions = new Map(); // Używamy Map aby uniknąć duplikatów

    // Przeiteruj po wszystkich dzieciach TEGO użytkownika
    for (const childId in childrenData) {
      const child = childrenData[childId];

      // Pomiń dzieci innych użytkowników i aktualne dziecko
      if (child.userId !== user.uid || childId === currentChildId) continue;

      // Pobierz nagrody tego dziecka
      const rewardsRef = ref(db, `users/${childId}/rewards`);
      const rewardsSnapshot = await get(rewardsRef);
      const rewardsData = rewardsSnapshot.val();

      if (rewardsData) {
        Object.values(rewardsData).forEach(reward => {
          // Tylko nagrody z Firebase Storage
          if (reward.name && !suggestions.has(reward.name) && isFirebaseStorageUrl(reward.image)) {
            suggestions.set(reward.name, {
              name: reward.name,
              image: reward.image,
              probability: reward.probability || 50
            });
          }
        });
      }
    }

    return Array.from(suggestions.values());
  } catch (error) {
    console.error('Błąd pobierania sugestii nagród:', error);
    return [];
  }
};

// Pobierz obrazki używane przez inne dzieci (tylko tego samego użytkownika, tylko Firebase Storage)
export const getCategoryImagesFromOtherChildren = async (currentChildId) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return [];
    }

    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    if (!childrenData) return [];

    const images = new Set(); // Używamy Set aby uniknąć duplikatów

    // Przeiteruj po wszystkich dzieciach TEGO użytkownika
    for (const childId in childrenData) {
      const child = childrenData[childId];

      // Pomiń dzieci innych użytkowników i aktualne dziecko
      if (child.userId !== user.uid || childId === currentChildId) continue;

      // Pobierz kategorie tego dziecka
      const categoriesRef = ref(db, `users/${childId}/categories`);
      const categoriesSnapshot = await get(categoriesRef);
      const categoriesData = categoriesSnapshot.val();

      if (categoriesData) {
        Object.values(categoriesData).forEach(cat => {
          // Tylko obrazki z Firebase Storage
          if (cat.image && cat.image.trim() && isFirebaseStorageUrl(cat.image)) {
            images.add(cat.image.trim());
          }
        });
      }
    }

    return Array.from(images);
  } catch (error) {
    console.error('Błąd pobierania obrazków z innych profili:', error);
    return [];
  }
};

// Usuń wszystkie dane użytkownika z bazy danych
export const deleteAllUserData = async () => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return false;
    }

    console.log('🗑️ Rozpoczynam usuwanie WSZYSTKICH danych użytkownika...');
    const deletePromises = [];

    // 1. Pobierz i usuń wszystkie dzieci tego użytkownika
    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    if (childrenData) {
      for (const childId in childrenData) {
        const child = childrenData[childId];
        if (child.userId === user.uid) {
          console.log(`  🗑️ Usuwam dziecko: ${child.name} (${childId})`);
          // Usuń dziecko z listy children
          deletePromises.push(remove(ref(db, `children/${childId}`)));
          // Usuń wszystkie dane dziecka (kategorie, nagrody, profil)
          deletePromises.push(remove(ref(db, `users/${childId}`)));
        }
      }
    }

    // 2. Usuń wszystkie pendingRewards tego użytkownika
    const pendingRewardsRef = ref(db, 'pendingRewards');
    const pendingRewardsSnapshot = await get(pendingRewardsRef);
    const pendingRewardsData = pendingRewardsSnapshot.val();

    if (pendingRewardsData) {
      for (const rewardId in pendingRewardsData) {
        const reward = pendingRewardsData[rewardId];
        if (reward.userId === user.uid) {
          console.log(`  🗑️ Usuwam zaległą nagrodę: ${rewardId}`);
          deletePromises.push(remove(ref(db, `pendingRewards/${rewardId}`)));
        }
      }
    }

    // 3. Usuń profil użytkownika
    console.log(`  🗑️ Usuwam profil użytkownika: ${user.uid}`);
    deletePromises.push(remove(ref(db, `userProfiles/${user.uid}`)));

    // Wykonaj wszystkie operacje usuwania równolegle
    await Promise.all(deletePromises);
    console.log('✅ Wszystkie dane użytkownika zostały usunięte');

    return true;
  } catch (error) {
    console.error('Błąd usuwania danych użytkownika:', error);
    return false;
  }
};

// ===== FUNKCJA CZYSZCZENIA I OPTYMALIZACJI BAZY DANYCH =====
export const cleanupDatabase = async () => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      console.error('Użytkownik nie jest zalogowany');
      return {
        success: false,
        error: 'Musisz być zalogowany aby wyczyścić bazę danych'
      };
    }

    console.log('🧹 === ROZPOCZYNAM CZYSZCZENIE BAZY DANYCH ===');
    const report = {
      orphanedUserData: 0,
      orphanedPendingRewards: 0,
      totalCleaned: 0
    };

    // 1. Pobierz wszystkie dzieci użytkownika
    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    const userChildIds = new Set();
    if (childrenData) {
      for (const childId in childrenData) {
        if (childrenData[childId].userId === user.uid) {
          userChildIds.add(childId);
        }
      }
    }

    console.log(`👶 Znaleziono ${userChildIds.size} dzieci użytkownika`);

    // 2. Wyczyść osierocone pendingRewards (dla dzieci które nie istnieją lub nie są nasze)
    const pendingRewardsRef = ref(db, 'pendingRewards');
    const pendingRewardsSnapshot = await get(pendingRewardsRef);
    const pendingRewardsData = pendingRewardsSnapshot.val();

    if (pendingRewardsData) {
      const deletePromises = [];
      for (const rewardId in pendingRewardsData) {
        const reward = pendingRewardsData[rewardId];

        // Usuń tylko nasze pendingRewards
        if (reward.userId === user.uid) {
          // Sprawdź czy dziecko dla tej nagrody nadal istnieje
          if (!userChildIds.has(reward.childId)) {
            console.log(`  🗑️ Usuwam osierocona nagrodę: ${rewardId} (dziecko ${reward.childId} nie istnieje)`);
            deletePromises.push(remove(ref(db, `pendingRewards/${rewardId}`)));
            report.orphanedPendingRewards++;
          }
        }
      }

      await Promise.all(deletePromises);
    }

    report.totalCleaned = report.orphanedUserData + report.orphanedPendingRewards;

    console.log('✅ === CZYSZCZENIE ZAKOŃCZONE ===');
    console.log(`📊 Raport:`);
    console.log(`  - Osierocone dane użytkowników: ${report.orphanedUserData}`);
    console.log(`  - Osierocone nagrody oczekujące: ${report.orphanedPendingRewards}`);
    console.log(`  - Łącznie wyczyszczono: ${report.totalCleaned} rekordów`);

    return {
      success: true,
      report
    };
  } catch (error) {
    console.error('Błąd podczas czyszczenia bazy danych:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ===== FUNKCJA RĘCZNEJ MIGRACJI DANYCH =====
// Użyj tej funkcji jeśli automatyczna migracja nie zadziałała
export const manualMigration = async () => {
  console.log('🔧 === RĘCZNA MIGRACJA DANYCH ===');

  const user = getCurrentAuthUser();
  if (!user) {
    console.error('❌ Użytkownik nie jest zalogowany!');
    alert('Musisz być zalogowany aby przeprowadzić migrację!');
    return false;
  }

  console.log(`✅ Zalogowany użytkownik: ${user.uid}`);
  console.log(`✅ Email: ${user.email}`);

  try {
    // Pobierz wszystkie dzieci
    const childrenRef = ref(db, 'children');
    const snapshot = await get(childrenRef);
    const data = snapshot.val();

    if (!data) {
      console.log('ℹ️ Brak dzieci w bazie danych');
      alert('Brak dzieci w bazie danych do migracji.');
      return false;
    }

    const allChildren = Object.keys(data).map(id => ({ id, ...data[id] }));
    console.log(`📊 Znaleziono ${allChildren.length} dzieci w bazie:`, allChildren);

    // Znajdź dzieci bez userId
    const childrenWithoutUserId = allChildren.filter(child => !child.userId);
    console.log(`🔍 Dzieci bez userId: ${childrenWithoutUserId.length}`, childrenWithoutUserId);

    // Znajdź dzieci należące do użytkownika
    const userChildren = allChildren.filter(child => child.userId === user.uid);
    console.log(`👤 Dzieci użytkownika ${user.uid}: ${userChildren.length}`, userChildren);

    if (childrenWithoutUserId.length === 0) {
      console.log('✅ Wszystkie dzieci mają już przypisany userId!');
      alert(`Wszystkie dzieci mają już przypisany userId.\n\nTwoje dzieci (${userChildren.length}): ${userChildren.map(c => c.name).join(', ')}`);
      return true;
    }

    // Zapytaj użytkownika czy chce przypisać dzieci bez userId
    const childrenNames = childrenWithoutUserId.map(c => c.name || `ID: ${c.id}`).join('\n- ');
    const confirm = window.confirm(
      `Znaleziono ${childrenWithoutUserId.length} dzieci bez przypisanego właściciela:\n\n- ${childrenNames}\n\n` +
      `Czy chcesz przypisać te dzieci do swojego konta (${user.email})?`
    );

    if (!confirm) {
      console.log('❌ Użytkownik anulował migrację');
      return false;
    }

    console.log('🔄 Rozpoczynam migrację...');

    // Przypisz dzieci do użytkownika
    const migrationPromises = childrenWithoutUserId.map(async (child) => {
      console.log(`  ➡️ Przypisywanie: ${child.name || child.id} -> ${user.uid}`);
      await update(ref(db, `children/${child.id}`), { userId: user.uid });
    });

    await Promise.all(migrationPromises);

    console.log('✅ Migracja zakończona pomyślnie!');
    alert(`✅ Migracja zakończona!\n\nPrzypisano ${childrenWithoutUserId.length} dzieci do Twojego konta.\n\nOdśwież stronę aby zobaczyć swoje dane.`);

    return true;
  } catch (error) {
    console.error('❌ Błąd podczas ręcznej migracji:', error);
    alert(`❌ Błąd podczas migracji:\n\n${error.message}`);
    return false;
  }
};

// Udostępnij funkcję globalnie w konsoli dla wygody
if (typeof window !== 'undefined') {
  window.manualMigration = manualMigration;
  console.log('🔧 Funkcja ręcznej migracji dostępna jako: window.manualMigration()');
}