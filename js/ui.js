// ===== OBSŁUGA INTERFEJSU UŻYTKOWNIKA =====
import { getCategories, getCurrentUser, getRewards } from './state.js';
import { addCrystal, resetCategory } from './database.js';
import { openRewardModal } from './rewards.js';

// Elementy DOM
export const elements = {
  container: document.getElementById('container'),
  maksBtn: document.getElementById('maksBtn'),
  ninaBtn: document.getElementById('ninaBtn'),
  adminBtn: document.getElementById('adminBtn'),
  rankingBtn: document.getElementById('rankingBtn'),
  maksAvatar: document.getElementById('maksAvatar'),
  ninaAvatar: document.getElementById('ninaAvatar')
};

// Renderowanie kategorii
export const renderCategories = () => {
  const categories = getCategories();
  const user = getCurrentUser();
  
  elements.container.innerHTML = '';
  
  categories.forEach(cat => {
    const card = createCategoryCard(cat, user);
    elements.container.appendChild(card);
  });
};

// Tworzenie karty kategorii
const createCategoryCard = (cat, user) => {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.style.backgroundColor = cat.color || '#FFB6C1';
  card.style.borderColor = cat.borderColor || '#FF69B4';
  
  const count = cat.count || 0;
  const goal = cat.goal || 10;
  const isReady = count >= goal;
  const pendingReset = cat.pendingReset || false;
  
  // Sprawdzenie czy to korona
  const wins = cat.wins?.[user] || 0;
  const isCrown = wins >= 3;
  
  if (isReady && !pendingReset) {
    card.classList.add('reward-ready');
    if (isCrown) {
      card.classList.add('reward-crown');
    }
  }
  
  // Obrazek
  const imgWrap = document.createElement('div');
  imgWrap.className = 'cat-img-wrap';
  
  if (cat.image) {
    const img = document.createElement('img');
    img.className = 'cat-img';
    img.src = cat.image;
    img.alt = cat.name;
    img.onerror = () => { img.style.display = 'none'; };
    imgWrap.appendChild(img);
  }
  
  card.appendChild(imgWrap);
  
  // Nazwa
  const name = document.createElement('div');
  name.className = 'category-name';
  name.textContent = cat.name;
  card.appendChild(name);
  
  // Licznik
  const countDiv = document.createElement('div');
  countDiv.className = 'crystal-count';
  countDiv.textContent = `${count} / ${goal}`;
  card.appendChild(countDiv);
  
  // Kryształki
  const crystalsDisplay = document.createElement('div');
  crystalsDisplay.className = 'crystals-display';
  
  for (let i = 0; i < goal; i++) {
    const crystal = document.createElement('span');
    crystal.className = 'crystal-item';
    crystal.textContent = '💎';
    
    if (i >= count) {
      crystal.classList.add('missing-crystal');
    }
    
    crystalsDisplay.appendChild(crystal);
  }
  
  card.appendChild(crystalsDisplay);
  
  // Ostatnia nagroda
  if (cat.lastReward) {
    const lastReward = document.createElement('div');
    lastReward.className = 'last-reward';
    lastReward.textContent = `🎁 ${cat.lastReward}`;
    card.appendChild(lastReward);
  }
  
  // Obsługa kliknięcia
  setupCardInteraction(card, cat.id, isReady, pendingReset);
  
  return card;
};

// Konfiguracja interakcji z kartą
const setupCardInteraction = (card, categoryId, isReady, pendingReset) => {
  let holdTimer = null;
  let fillAnimTimeout = null;
  
  const startHold = () => {
    if (isReady && !pendingReset) return;
    if (pendingReset) return;
    
    card.classList.add('active-hold');
    card.classList.add('filling');
    
    fillAnimTimeout = setTimeout(() => {
      card.classList.remove('filling');
      card.classList.add('filling-complete');
    }, 500);
    
    holdTimer = setTimeout(async () => {
      await addCrystal(categoryId);
    }, 500);
  };
  
  const cancelHold = () => {
    clearTimeout(holdTimer);
    clearTimeout(fillAnimTimeout);
    card.classList.remove('active-hold', 'filling', 'filling-complete');
  };
  
  const handleClick = () => {
    if (isReady && !pendingReset) {
      openRewardModal(categoryId);
    } else if (pendingReset) {
      handlePendingReset(card, categoryId);
    }
  };
  
  // Mouse events
  card.addEventListener('mousedown', startHold);
  card.addEventListener('mouseup', cancelHold);
  card.addEventListener('mouseleave', cancelHold);
  card.addEventListener('click', handleClick);
  
  // Touch events
  card.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startHold();
  });
  
  card.addEventListener('touchend', (e) => {
    e.preventDefault();
    cancelHold();
    handleClick();
  });
  
  card.addEventListener('touchcancel', cancelHold);
};

// Obsługa pending reset
const handlePendingReset = (card, categoryId) => {
  card.classList.add('reset-filling');
  
  setTimeout(() => {
    card.classList.remove('reset-filling');
  }, 500);
  
  setTimeout(async () => {
    await resetCategory(categoryId);
  }, 500);
};

// Wyświetlanie confetti
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

// Zmiana użytkownika
export const switchUser = (user, setupRealtimeListener, listenRewardsForUser) => {
  if (user === 'maks') {
    document.body.classList.remove('nina-bg');
    document.body.classList.add('maks-bg');
    elements.maksBtn.classList.add('active-user');
    elements.ninaBtn.classList.remove('active-user');
  } else {
    document.body.classList.remove('maks-bg');
    document.body.classList.add('nina-bg');
    elements.ninaBtn.classList.add('active-user');
    elements.maksBtn.classList.remove('active-user');
  }
  
  setupRealtimeListener(user);
  listenRewardsForUser(user);
};

// Ładowanie avatara
export const loadAvatar = (user, imgElement, getAvatar) => {
  getAvatar(user, (url) => {
    if (imgElement) {
      if (url) {
        imgElement.src = url;
        imgElement.style.display = 'block';
      } else {
        imgElement.removeAttribute('src');
        imgElement.style.display = 'block';
      }
    }
  });
};

// Wyświetlanie rankingu
export const displayRanking = () => {
  const categories = getCategories();
  const rankingContent = document.getElementById('rankingContent');
  
  // Ranking Maksa
  const maksCategories = categories.map(cat => ({
    name: cat.name,
    wins: cat.wins?.maks || 0
  })).sort((a, b) => b.wins - a.wins);
  
  // Ranking Niny
  const ninaCategories = categories.map(cat => ({
    name: cat.name,
    wins: cat.wins?.nina || 0
  })).sort((a, b) => b.wins - a.wins);
  
  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };
  
  rankingContent.innerHTML = `
    <div class="user-ranking-section">
      <h3>🔵 Ranking Maksa</h3>
      <ul class="ranking-list">
        ${maksCategories.map((cat, i) => `
          <li>
            <span class="medal">${getMedal(i)}</span>
            <span class="category-name-rank">${cat.name}</span>
            <span class="wins-count">${cat.wins}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    <div class="user-ranking-section">
      <h3>🔴 Ranking Niny</h3>
      <ul class="ranking-list">
        ${ninaCategories.map((cat, i) => `
          <li>
            <span class="medal">${getMedal(i)}</span>
            <span class="category-name-rank">${cat.name}</span>
            <span class="wins-count">${cat.wins}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
};