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
    img.onerror = () => { 
      // Jeśli obrazek się nie załaduje, pokaż placeholder
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e0e5ec"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="80" fill="%23999"%3E' + encodeURIComponent(cat.name.charAt(0).toUpperCase()) + '%3C/text%3E%3C/svg%3E';
      img.onerror = null; // Zapobiegaj nieskończonej pętli
    };
    imgWrap.appendChild(img);
  } else {
    // Brak obrazka - pokaż placeholder z pierwszą literą
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;font-weight:700;color:#999;background:#f0f0f0;';
    placeholder.textContent = cat.name.charAt(0).toUpperCase();
    imgWrap.appendChild(placeholder);
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
        imgElement.onerror = () => {
          // Jeśli obrazek się nie załaduje, użyj placeholdera
          imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23' + (user === 'maks' ? 'a0c4ff' : 'ffc2d1') + '"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="%23fff"%3E' + user.charAt(0).toUpperCase() + '%3C/text%3E%3C/svg%3E';
          imgElement.onerror = null;
        };
      } else {
        // Brak URL - użyj domyślnego placeholdera
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23' + (user === 'maks' ? 'a0c4ff' : 'ffc2d1') + '"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="%23fff"%3E' + user.charAt(0).toUpperCase() + '%3C/text%3E%3C/svg%3E';
        imgElement.style.display = 'block';
      }
    }
  });
};

// Wyświetlanie rankingu
export const displayRanking = () => {
  const categories = getCategories();
  const rankingContent = document.getElementById('rankingContent');
  
  // Przygotuj dane dla każdej kategorii
  const categoryStats = categories.map(cat => ({
    name: cat.name,
    maksWins: cat.wins?.maks || 0,
    ninaWins: cat.wins?.nina || 0,
    color: cat.color || '#FFB6C1'
  }));
  
  // Sortuj według sumy zwycięstw (najbardziej aktywne kategorie)
  categoryStats.sort((a, b) => {
    const totalA = a.maksWins + a.ninaWins;
    const totalB = b.maksWins + b.ninaWins;
    return totalB - totalA;
  });
  
  // Generuj HTML dla każdej kategorii
  const categoriesHtml = categoryStats.map(cat => {
    const maksWins = cat.maksWins;
    const ninaWins = cat.ninaWins;
    const total = maksWins + ninaWins;
    
    // Jeśli brak zwycięstw w tej kategorii, pomiń
    if (total === 0) return '';
    
    // Określ zwycięzcę
    let winnerBadge = '';
    if (maksWins > ninaWins) {
      winnerBadge = '<span class="winner-badge maks-winner">👑</span>';
    } else if (ninaWins > maksWins) {
      winnerBadge = '<span class="winner-badge nina-winner">👑</span>';
    } else if (maksWins === ninaWins && maksWins > 0) {
      winnerBadge = '<span class="winner-badge tie">🤝</span>';
    }
    
    // Szerokość paska postępu
    const maksWidth = total > 0 ? (maksWins / total) * 100 : 0;
    const ninaWidth = total > 0 ? (ninaWins / total) * 100 : 0;
    
    return `
      <div class="category-ranking-item">
        <div class="category-ranking-header">
          <span class="category-ranking-name">${cat.name}</span>
          ${winnerBadge}
        </div>
        <div class="category-ranking-bars">
          <div class="ranking-bar-row">
            <span class="ranking-label maks-label">Maks</span>
            <div class="ranking-bar">
              <div class="ranking-bar-fill maks-bar" style="width: ${maksWidth}%"></div>
            </div>
            <span class="ranking-score">${maksWins}</span>
          </div>
          <div class="ranking-bar-row">
            <span class="ranking-label nina-label">Nina</span>
            <div class="ranking-bar">
              <div class="ranking-bar-fill nina-bar" style="width: ${ninaWidth}%"></div>
            </div>
            <span class="ranking-score">${ninaWins}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Oblicz całkowite statystyki
  const totalMaksWins = categoryStats.reduce((sum, cat) => sum + cat.maksWins, 0);
  const totalNinaWins = categoryStats.reduce((sum, cat) => sum + cat.ninaWins, 0);
  
  let overallWinner = '';
  if (totalMaksWins > totalNinaWins) {
    overallWinner = '<div class="overall-winner maks-overall">🏆 Maks prowadzi z ' + totalMaksWins + ' zwycięstwami!</div>';
  } else if (totalNinaWins > totalMaksWins) {
    overallWinner = '<div class="overall-winner nina-overall">🏆 Nina prowadzi z ' + totalNinaWins + ' zwycięstwami!</div>';
  } else if (totalMaksWins > 0 && totalNinaWins > 0) {
    overallWinner = '<div class="overall-winner tie-overall">🤝 Remis! Oboje mają po ' + totalMaksWins + ' zwycięstw!</div>';
  }
  
  rankingContent.innerHTML = `
    ${overallWinner}
    <div class="ranking-categories">
      ${categoriesHtml || '<div style="text-align:center;padding:2rem;color:#999;">Brak jeszcze zwycięstw. Czas zdobyć pierwsze nagrody! 🎯</div>'}
    </div>
  `;
};