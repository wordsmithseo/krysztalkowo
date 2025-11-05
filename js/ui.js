// ===== OBSŁUGA INTERFEJSU UŻYTKOWNIKA =====
import { getCategories, getCurrentUser, getCachedData, getChildren } from './state.js';
import { addCrystal, resetCategory, getPendingRewards, completePendingReward } from './database.js';
import { openRewardModal } from './rewards.js';
import { loginUser } from './auth.js';

export const elements = {
  container: document.getElementById('container'),
  maksBtn: document.getElementById('maksBtn'),
  ninaBtn: document.getElementById('ninaBtn'),
  adminBtn: document.getElementById('adminBtn'),
  rankingBtn: document.getElementById('rankingBtn'),
  maksAvatar: document.getElementById('maksAvatar'),
  ninaAvatar: document.getElementById('ninaAvatar'),
  userButtonsRow: document.querySelector('.user-buttons-row')
};

let renderScheduled = false;

// Mapa przechowująca aktywne cooldowny
const activeCooldowns = new Map();

// Cache dla obrazków
const imageCache = new Map();

// Funkcja do preloadowania obrazków z cache
const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    // Sprawdź czy obrazek jest już w cache
    if (imageCache.has(url)) {
      resolve(imageCache.get(url));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img.src);
      resolve(img.src);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
};

// Funkcja do preloadowania wszystkich obrazków kategorii
const preloadCategoryImages = (categories) => {
  categories.forEach(cat => {
    if (cat.image) {
      preloadImage(cat.image).catch(() => {
        // Ignoruj błędy - użyj fallback przy renderowaniu
      });
    }
  });
};

// ===== LOADER PROFILU =====
let profileLoaderElement = null;

export const showProfileLoader = (childName) => {
  // Usuń istniejący loader jeśli jest
  hideProfileLoader();
  
  // Utwórz nowy loader
  profileLoaderElement = document.createElement('div');
  profileLoaderElement.className = 'profile-loader';
  profileLoaderElement.innerHTML = `
    <div class="profile-loader-content">
      <div class="profile-loader-spinner"></div>
      <div class="profile-loader-text">Ładowanie profilu ${childName}...</div>
    </div>
  `;
  
  document.body.appendChild(profileLoaderElement);
  
  // Pokaż loader
  requestAnimationFrame(() => {
    profileLoaderElement.classList.add('visible');
  });
};

export const hideProfileLoader = () => {
  if (profileLoaderElement) {
    profileLoaderElement.classList.remove('visible');
    setTimeout(() => {
      if (profileLoaderElement && profileLoaderElement.parentNode) {
        profileLoaderElement.parentNode.removeChild(profileLoaderElement);
        profileLoaderElement = null;
      }
    }, 300);
  }
};

export const renderCategories = () => {
  if (renderScheduled) return;

  renderScheduled = true;
  requestAnimationFrame(() => {
    const categories = getCategories();
    const user = getCurrentUser();
    const fragment = document.createDocumentFragment();

    // Preloaduj obrazki
    preloadCategoryImages(categories);

    categories.forEach(cat => {
      const card = createCategoryCard(cat, user);
      fragment.appendChild(card);
    });

    elements.container.innerHTML = '';
    elements.container.appendChild(fragment);
    renderScheduled = false;

    // Sprawdź czy pokazać wskazówki
    showEmptyStateGuide();

    // Ukryj loader profilu po wyrenderowaniu
    hideProfileLoader();

    // Przywróć modal nagród, jeśli kategoria ma pendingReset
    const pendingCategory = categories.find(cat => cat.pendingReset === true);
    if (pendingCategory) {
      // Opóźnij otwarcie modalu, żeby UI się zdążyło załadować
      setTimeout(() => {
        openRewardModal(pendingCategory.id);
      }, 500);
    }
  });
};

const createCategoryCard = (cat, user) => {
  const card = document.createElement('div');
  card.className = 'category-card';
  
  const count = cat.count || 0;
  const goal = cat.goal || 10;
  const isReady = count >= goal;
  const pendingReset = cat.pendingReset || false;
  
  const wins = cat.wins?.[user] || 0;
  const isCrown = wins >= 3;
  
  if (isReady && !pendingReset) {
    card.classList.add('reward-ready');
    if (isCrown) {
      card.classList.add('reward-crown');
    }
  } else if (pendingReset) {
    card.classList.add('reward-won');
    if (isCrown) {
      card.classList.add('reward-crown');
    }
  } else {
    card.style.backgroundColor = cat.color || '#FFB6C1';
    card.style.borderColor = cat.borderColor || '#FF69B4';
  }
  
  const imgWrap = document.createElement('div');
  imgWrap.className = 'cat-img-wrap';
  
  if (cat.image) {
    const img = document.createElement('img');
    img.className = 'cat-img';
    
    // Użyj cache'owanego obrazka jeśli dostępny
    if (imageCache.has(cat.image)) {
      img.src = imageCache.get(cat.image);
    } else {
      img.src = cat.image;
      // Dodaj do cache po załadowaniu
      img.onload = () => {
        imageCache.set(cat.image, cat.image);
      };
    }
    
    img.alt = cat.name;
    img.onerror = () => { 
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e5ec"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="80" fill="%23999"%3E' + encodeURIComponent(cat.name.charAt(0).toUpperCase()) + '%3C/text%3E%3C/svg%3E';
      img.onerror = null;
    };
    imgWrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;font-weight:700;color:#999;background:#f0f0f0;';
    placeholder.textContent = cat.name.charAt(0).toUpperCase();
    imgWrap.appendChild(placeholder);
  }
  
  card.appendChild(imgWrap);
  
  const name = document.createElement('div');
  name.className = 'category-name';
  name.textContent = cat.name;
  card.appendChild(name);
  
  const countDiv = document.createElement('div');
  countDiv.className = 'crystal-count';
  countDiv.textContent = `${count} / ${goal}`;
  card.appendChild(countDiv);
  
  const crystalsDisplay = document.createElement('div');
  crystalsDisplay.className = 'crystals-display';
  
  // Sprawdź czy kategoria jest w cooldownie
  const lastAddTimestamp = cat.lastAddTimestamp || 0;
  const now = Date.now();
  const timeDiff = now - lastAddTimestamp;
  const cooldownMs = 30000;
  const isInCooldown = timeDiff < cooldownMs && count < goal;
  
  for (let i = 0; i < goal; i++) {
    const crystal = document.createElement('span');
    crystal.className = 'crystal-item';
    crystal.textContent = '💎';
    
    if (i >= count) {
      crystal.classList.add('missing-crystal');
      
      // Dodaj pulsowanie do następnego dostępnego kryształka podczas cooldownu
      if (isInCooldown && i === count) {
        crystal.classList.add('next-available');
        
        // Usuń klasę po zakończeniu cooldownu
        const remainingTime = cooldownMs - timeDiff;
        const cooldownKey = `${cat.id}-${count}`;
        
        if (activeCooldowns.has(cooldownKey)) {
          clearTimeout(activeCooldowns.get(cooldownKey));
        }
        
        const timeoutId = setTimeout(() => {
          crystal.classList.remove('next-available');
          activeCooldowns.delete(cooldownKey);
        }, remainingTime);
        
        activeCooldowns.set(cooldownKey, timeoutId);
      }
    }
    
    crystalsDisplay.appendChild(crystal);
  }
  
  card.appendChild(crystalsDisplay);
  
  if (pendingReset && cat.lastReward) {
    const lastReward = document.createElement('div');
    lastReward.className = 'last-reward';
    lastReward.textContent = `🎁 ${cat.lastReward}`;
    card.appendChild(lastReward);
  }
  
  setupCardInteraction(card, cat.id, isReady, pendingReset, count, goal);
  
  return card;
};

const setupCardInteraction = (card, categoryId, isReady, pendingReset, currentCount, goal) => {
  let holdTimer = null;
  let fillAnimTimeout = null;
  let isTouchMoved = false;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isHolding = false;
  const SCROLL_THRESHOLD = 10;

  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const startHold = () => {
    if (isHolding) return;

    if (isReady && !pendingReset) {
      return;
    }

    isHolding = true;

    card.classList.add('active-hold');

    vibrate(50);

    if (pendingReset) {
      card.classList.add('reset-filling');
    } else {
      card.classList.add('filling');
    }

    fillAnimTimeout = setTimeout(() => {
      card.classList.remove('filling', 'reset-filling');
      card.classList.add('filling-complete');
    }, 500);

    holdTimer = setTimeout(async () => {
      vibrate([100, 50, 100]);

      if (pendingReset) {
        await resetCategory(categoryId);
      } else {
        const newCount = currentCount + 1;
        const willComplete = newCount >= goal;

        const success = await addCrystal(categoryId);

        if (!success) {
          return;
        }

        if (willComplete) {
          vibrate([200, 100, 200, 100, 200]);

          setTimeout(() => {
            openRewardModal(categoryId);
          }, 1000);
        }
      }
    }, 500);
  };
  
  const cancelHold = () => {
    if (!isHolding) return;
    
    clearTimeout(holdTimer);
    clearTimeout(fillAnimTimeout);
    card.classList.remove('active-hold', 'filling', 'filling-complete', 'reset-filling');
    isHolding = false;
  };
  
  card.addEventListener('mousedown', startHold);
  card.addEventListener('mouseup', cancelHold);
  card.addEventListener('mouseleave', cancelHold);
  
  card.addEventListener('touchstart', (e) => {
    isTouchMoved = false;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    
    startHold();
  }, { passive: true });
  
  card.addEventListener('touchmove', (e) => {
    const touchCurrentY = e.touches[0].clientY;
    const deltaY = Math.abs(touchCurrentY - touchStartY);
    
    if (deltaY > SCROLL_THRESHOLD) {
      isTouchMoved = true;
      cancelHold();
    }
  }, { passive: true });
  
  card.addEventListener('touchend', (e) => {
    if (isTouchMoved) {
      cancelHold();
      isTouchMoved = false;
      return;
    }
    
    const holdDuration = Date.now() - touchStartTime;
    
    if (holdDuration < 500) {
      cancelHold();
    }
    
    isTouchMoved = false;
  });
  
  card.addEventListener('touchcancel', cancelHold);
};

export const fireConfetti = () => {
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#9370DB']
    });
  }
};

export const switchUser = (user, setupRealtimeListener, listenRewardsForUser) => {
  const children = getChildren();
  const child = children.find(c => c.id === user);
  
  if (!child) return;
  
  // Pokaż loader profilu
  showProfileLoader(child.name);
  
  // Zapisz wybór do localStorage
  localStorage.setItem('selectedChildId', user);
  
  const bgClass = child.gender === 'male' ? 'maks-bg' : 'nina-bg';
  const otherBgClass = child.gender === 'male' ? 'nina-bg' : 'maks-bg';
  
  document.body.classList.remove(otherBgClass);
  document.body.classList.add(bgClass);
  
  document.querySelectorAll('.user-btn').forEach(btn => {
    btn.classList.remove('active-user');
  });
  
  const activeBtn = document.getElementById(`user-${user}`);
  if (activeBtn) {
    activeBtn.classList.add('active-user');
  }
  
  const cached = getCachedData(user);
  if (cached.categories) {
    import('./state.js').then(({ setCategories }) => {
      setCategories(cached.categories);
      renderCategories();
    });
  }
  if (cached.rewards) {
    import('./state.js').then(({ setRewards }) => {
      setRewards(cached.rewards);
    });
  }
  
  setupRealtimeListener(user);
  listenRewardsForUser(user);
};

export const loadAvatar = (user, imgElement, getAvatar) => {
  getAvatar(user, (url) => {
    if (imgElement) {
      if (url) {
        // Użyj cache dla avatarów
        if (imageCache.has(url)) {
          imgElement.src = imageCache.get(url);
          imgElement.style.display = 'block';
        } else {
          imgElement.src = url;
          imgElement.style.display = 'block';
          imgElement.onload = () => {
            imageCache.set(url, url);
          };
          imgElement.onerror = () => {
            const children = getChildren();
            const child = children.find(c => c.id === user);
            const color = child && child.gender === 'female' ? 'ffc2d1' : 'a0c4ff';
            imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23' + color + '"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="%23fff"%3E' + (child ? child.name.charAt(0).toUpperCase() : 'U') + '%3C/text%3E%3C/svg%3E';
            imgElement.onerror = null;
          };
        }
      } else {
        const children = getChildren();
        const child = children.find(c => c.id === user);
        const color = child && child.gender === 'female' ? 'ffc2d1' : 'a0c4ff';
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23' + color + '"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="%23fff"%3E' + (child ? child.name.charAt(0).toUpperCase() : 'U') + '%3C/text%3E%3C/svg%3E';
        imgElement.style.display = 'block';
      }
    }
  });
};

export const displayRanking = () => {
  const rankingContent = document.getElementById('rankingContent');
  const children = getChildren();
  
  const allData = {};
  
  children.forEach(child => {
    const cached = getCachedData(child.id);
    if (cached.categories) {
      allData[child.id] = {
        name: child.name,
        gender: child.gender,
        categories: cached.categories
      };
    }
  });
  
  const categoryGroups = {};
  
  Object.keys(allData).forEach(userId => {
    const userData = allData[userId];
    userData.categories.forEach(cat => {
      if (!categoryGroups[cat.name]) {
        categoryGroups[cat.name] = {};
      }
      
      const wins = cat.wins?.[userId] || 0;
      categoryGroups[cat.name][userId] = (categoryGroups[cat.name][userId] || 0) + wins;
    });
  });
  
  const categoryStats = Object.keys(categoryGroups).map(catName => {
    const stats = categoryGroups[catName];
    const userIds = Object.keys(stats);
    const total = userIds.reduce((sum, uid) => sum + stats[uid], 0);
    const hasMultipleUsers = userIds.length > 1;
    
    return {
      name: catName,
      users: stats,
      total,
      hasMultipleUsers
    };
  }).filter(cat => cat.total > 0);
  
  categoryStats.sort((a, b) => {
    if (a.hasMultipleUsers && !b.hasMultipleUsers) return -1;
    if (!a.hasMultipleUsers && b.hasMultipleUsers) return 1;
    return b.total - a.total;
  });
  
  const competitiveCategories = categoryStats.filter(cat => cat.hasMultipleUsers);
  const soloCategories = categoryStats.filter(cat => !cat.hasMultipleUsers);
  
  let html = '';
  
  const totalsByUser = {};
  children.forEach(child => {
    totalsByUser[child.id] = 0;
  });
  
  Object.values(categoryGroups).forEach(catUsers => {
    Object.keys(catUsers).forEach(userId => {
      if (totalsByUser[userId] !== undefined) {
        totalsByUser[userId] += catUsers[userId];
      }
    });
  });
  
  const sortedTotals = Object.entries(totalsByUser)
    .filter(([_, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedTotals.length > 0) {
    const topUserId = sortedTotals[0][0];
    const topTotal = sortedTotals[0][1];
    const topChild = children.find(c => c.id === topUserId);
    
    if (sortedTotals.length > 1 && sortedTotals[1][1] === topTotal) {
      html += `<div class="overall-winner tie-overall">🤝 Remis!<br><span style="font-size:2rem;font-weight:900;">`;
      sortedTotals.filter(([_, t]) => t === topTotal).forEach(([uid, _], idx) => {
        const child = children.find(c => c.id === uid);
        if (idx > 0) html += ' : ';
        html += topTotal;
      });
      html += `</span></div>`;
    } else if (topChild) {
      const genderClass = topChild.gender === 'male' ? 'maks-overall' : 'nina-overall';
      html += `<div class="overall-winner ${genderClass}">🏆 ${topChild.name} prowadzi!<br><span style="font-size:2rem;font-weight:900;">${topTotal}`;
      if (sortedTotals.length > 1) {
        html += ` : ${sortedTotals[1][1]}`;
      }
      html += `</span></div>`;
    }
  }
  
  if (competitiveCategories.length > 0) {
    html += '<div class="ranking-section"><h3>🏆 Rywalizacja</h3>';
    competitiveCategories.forEach(cat => {
      const userIds = Object.keys(cat.users);
      const maxWins = Math.max(...Object.values(cat.users));
      const winners = userIds.filter(uid => cat.users[uid] === maxWins);
      
      let winnerBadge = '';
      if (winners.length === 1) {
        const winnerChild = children.find(c => c.id === winners[0]);
        if (winnerChild) {
          const genderClass = winnerChild.gender === 'male' ? 'maks-winner' : 'nina-winner';
          winnerBadge = `<span class="winner-badge ${genderClass}">${winnerChild.name} 👑</span>`;
        }
      } else {
        winnerBadge = '<span class="winner-badge tie">🤝 Remis</span>';
      }
      
      html += `
        <div class="category-ranking-item">
          <div class="category-ranking-header">
            <span class="category-ranking-name">${cat.name}</span>
            ${winnerBadge}
          </div>
          <div class="category-ranking-bars">
      `;
      
      userIds.forEach(userId => {
        const child = children.find(c => c.id === userId);
        if (!child) return;
        
        const wins = cat.users[userId];
        const percentage = cat.total > 0 ? (wins / cat.total) * 100 : 0;
        const genderClass = child.gender === 'male' ? 'maks' : 'nina';
        
        html += `
          <div class="ranking-bar-row">
            <span class="ranking-label ${genderClass}-label">${child.name}</span>
            <div class="ranking-bar">
              <div class="ranking-bar-fill ${genderClass}-bar" style="width: ${percentage}%"></div>
            </div>
            <span class="ranking-score">${wins}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  if (soloCategories.length > 0) {
    const soloByUser = {};
    soloCategories.forEach(cat => {
      const userId = Object.keys(cat.users)[0];
      if (!soloByUser[userId]) {
        soloByUser[userId] = [];
      }
      soloByUser[userId].push(cat);
    });
    
    Object.keys(soloByUser).forEach(userId => {
      const child = children.find(c => c.id === userId);
      if (!child) return;
      
      const genderClass = child.gender === 'male' ? 'maks' : 'nina';
      const icon = child.gender === 'male' ? '🔵' : '🔴';
      
      html += `<div class="ranking-section"><h3>${icon} ${child.name}</h3>`;
      soloByUser[userId].forEach(cat => {
        const wins = cat.users[userId];
        html += `
          <div class="category-ranking-item solo-category ${genderClass}-category">
            <div class="solo-category-row">
              <span class="solo-category-name">${cat.name}</span>
              <span class="solo-category-score ${genderClass}-score">${wins} 🏆</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
    });
  }
  
  if (html === '') {
    html = '<div style="text-align:center;padding:2rem 1rem;color:#999;font-size:1.1rem;"><div style="font-size:3rem;margin-bottom:0.5rem;">🎯</div><div>Brak zwycięstw</div></div>';
  }
  
  rankingContent.innerHTML = html;
};

export const displayPendingRewards = async () => {
  const pendingRewardsContent = document.getElementById('pendingRewardsContent');
  const children = getChildren();
  
  try {
    const pendingRewards = await getPendingRewards();
    
    if (!pendingRewards || pendingRewards.length === 0) {
      pendingRewardsContent.innerHTML = `
        <div class="empty-pending-rewards">
          <div class="empty-pending-rewards-icon">📋</div>
          <div class="empty-pending-rewards-text">Brak zaległych nagród do zrealizowania</div>
        </div>
      `;
      return;
    }
    
    let html = '<ul class="pending-rewards-list">';
    
    pendingRewards.forEach(reward => {
      const child = children.find(c => c.id === reward.childId);
      if (!child) return;
      
      const genderIcon = child.gender === 'male' ? '👦' : '👧';
      const date = new Date(reward.timestamp).toLocaleDateString('pl-PL');
      
      html += `
        <li class="pending-reward-item" data-reward-id="${reward.id}">
          <div class="pending-reward-header">
            <span class="pending-reward-child-icon">${genderIcon}</span>
            <span class="pending-reward-child-name">${child.name}</span>
            <span class="pending-reward-category">${reward.categoryName}</span>
          </div>
          <div class="pending-reward-body">
            <div>
              <div class="pending-reward-name">🎁 ${reward.rewardName}</div>
              <div class="pending-reward-date">${date}</div>
            </div>
            <button class="complete-reward-btn" onclick="window.completePendingRewardHandler('${reward.id}')">
              ✅ Zrealizuj
            </button>
          </div>
        </li>
      `;
    });
    
    html += '</ul>';
    pendingRewardsContent.innerHTML = html;
    
  } catch (error) {
    console.error('Błąd pobierania zaległych nagród:', error);
    pendingRewardsContent.innerHTML = `
      <div class="empty-pending-rewards">
        <div class="empty-pending-rewards-icon">❌</div>
        <div class="empty-pending-rewards-text">Błąd ładowania zaległych nagród</div>
      </div>
    `;
  }
};

// Handler realizacji nagrody z komunikatem w modalu
window.completePendingRewardHandler = async (rewardId) => {
  const passwordModal = document.createElement('div');
  passwordModal.className = 'modal';
  passwordModal.style.display = 'flex';
  passwordModal.innerHTML = `
    <div class="modal-content password-modal-content">
      <h2>Weryfikacja hasła</h2>
      <p style="color: #666; margin: 0.5rem 0 1.5rem 0; font-size: 0.95rem;">Wprowadź hasło do swojego konta, aby zrealizować tę nagrodę.</p>
      <label>Hasło:</label>
      <input type="password" id="completeRewardPassword" placeholder="Twoje hasło">
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <button id="completeRewardCancel" class="cancel-btn" style="flex:1;">Anuluj</button>
        <button id="completeRewardConfirm" class="submit-btn" style="flex:1;">Potwierdź</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(passwordModal);
  
  const passwordInput = passwordModal.querySelector('#completeRewardPassword');
  const confirmBtn = passwordModal.querySelector('#completeRewardConfirm');
  const cancelBtn = passwordModal.querySelector('#completeRewardCancel');
  
  passwordInput.focus();
  
  const closeModal = () => {
    passwordModal.style.display = 'none';
    setTimeout(() => passwordModal.remove(), 300);
  };
  
  cancelBtn.onclick = closeModal;
  
  passwordModal.onclick = (e) => {
    if (e.target === passwordModal) {
      closeModal();
    }
  };
  
  const handleConfirm = async () => {
    const password = passwordInput.value;
    
    if (!password) {
      alert('Podaj hasło!');
      return;
    }
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sprawdzanie...';
    
    const user = await import('./auth.js').then(m => m.getCurrentAuthUser());
    if (!user) {
      alert('Błąd: Musisz być zalogowany!');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Potwierdź';
      return;
    }
    
    const result = await loginUser(user.email, password);
    
    if (result.success) {
      // Zmień zawartość modala na komunikat o sukcesie
      const modalContent = passwordModal.querySelector('.modal-content');
      modalContent.innerHTML = `
        <div style="text-align: center; padding: 2rem 1.5rem;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
          <h2 style="color: #2ecc71 !important; margin-bottom: 1rem;">Nagroda zrealizowana!</h2>
          <p style="color: #666; font-size: 1rem; margin-bottom: 1.5rem;">
            Nagroda została pomyślnie zrealizowana i usunięta z listy zaległych nagród.
          </p>
          <button id="closeSuccessBtn" class="submit-btn" style="width: 100%;">Zamknij</button>
        </div>
      `;
      
      // Realizuj nagrodę w tle
      await completePendingReward(rewardId);
      
      // Obsługa przycisku zamknięcia
      const closeSuccessBtn = modalContent.querySelector('#closeSuccessBtn');
      closeSuccessBtn.onclick = () => {
        closeModal();
        // Odśwież listę zaległych nagród
        displayPendingRewards();
      };
      
      // Automatyczne zamknięcie po 3 sekundach
      setTimeout(() => {
        closeModal();
        displayPendingRewards();
      }, 3000);
    } else {
      alert('❌ Nieprawidłowe hasło!');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Potwierdź';
    }
  };
  
  confirmBtn.onclick = handleConfirm;
  
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  });
};

export const updateUserButtons = () => {
  const children = getChildren();
  
  if (!elements.userButtonsRow) return;
  
  // Jeśli nie ma dzieci, nie pokazuj przycisków
  if (children.length === 0) {
    elements.userButtonsRow.innerHTML = '';
    showEmptyStateGuide();
    return;
  }
  
  elements.userButtonsRow.innerHTML = children.map(child => {
    const genderClass = child.gender === 'male' ? 'maks' : 'nina';
    return `
      <button id="user-${child.id}" class="user-btn ${genderClass}-btn" data-user-id="${child.id}">
        <span class="avatar-wrap">
          <img id="avatar-${child.id}" class="avatar-img" alt="${child.name}">
        </span>
        ${child.name}
      </button>
    `;
  }).join('');
  
  children.forEach(child => {
    const btn = document.getElementById(`user-${child.id}`);
    const avatar = document.getElementById(`avatar-${child.id}`);
    
    if (btn) {
      btn.addEventListener('click', () => {
        import('./state.js').then(({ setCurrentUser }) => {
          setCurrentUser(child.id);
          import('./database.js').then(({ setupRealtimeListener, listenRewardsForUser }) => {
            switchUser(child.id, setupRealtimeListener, listenRewardsForUser);
          });
        });
      });
    }
    
    if (avatar) {
      import('./database.js').then(({ getAvatar }) => {
        loadAvatar(child.id, avatar, getAvatar);
      });
    }
  });
  
  // Sprawdź czy pokazać wskazówki
  showEmptyStateGuide();
};

// Funkcja pokazująca wskazówki dla pustych stanów
export const showEmptyStateGuide = () => {
  const children = getChildren();
  const categories = getCategories();
  const container = elements.container;
  const adminBtn = elements.adminBtn;
  
  // Usuń istniejące wskazówki
  document.querySelectorAll('.empty-guide').forEach(el => el.remove());
  
  // Brak dzieci
  if (children.length === 0) {
    const guide = document.createElement('div');
    guide.className = 'empty-guide children-guide';
    guide.innerHTML = `
      <div class="empty-guide-content">
        <div class="empty-guide-icon">👶</div>
        <h3>Dodaj pierwsze dziecko!</h3>
        <p>Kliknij przycisk "Panel admina" poniżej, aby dodać profil dziecka.</p>
        <div class="empty-guide-arrow">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <path d="M30 10 L30 40 M20 30 L30 40 L40 30" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;
    
    // Wstaw przed przyciskiem admina
    if (adminBtn && adminBtn.parentElement) {
      adminBtn.parentElement.insertBefore(guide, adminBtn.parentElement.firstChild);
    }
    
    // Dodaj efekt pulsowania do przycisku
    if (adminBtn) {
      adminBtn.classList.add('pulse-hint');
    }
    
    return;
  }
  
  // Brak kategorii
  if (categories.length === 0 && container) {
    const guide = document.createElement('div');
    guide.className = 'empty-guide categories-guide';
    guide.innerHTML = `
      <div class="empty-guide-content">
        <div class="empty-guide-icon">📝</div>
        <h3>Dodaj pierwszą kategorię!</h3>
        <p>Kategorie to cele do osiągnięcia, np. "Posprzątaj pokój" lub "Zjedz warzywa".</p>
        <p style="margin-top: 0.5rem;">Kliknij "Panel admina" i dodaj kategorie, żeby zacząć zbierać kryształki!</p>
        <div class="empty-guide-arrow">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <path d="M30 10 L30 40 M20 30 L30 40 L40 30" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;
    
    container.appendChild(guide);
    
    // Dodaj efekt pulsowania do przycisku
    if (adminBtn) {
      adminBtn.classList.add('pulse-hint');
    }
    
    return;
  }
  
  // Usuń pulsowanie jeśli wszystko OK
  if (adminBtn) {
    adminBtn.classList.remove('pulse-hint');
  }
};