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
  
  const count = cat.count || 0;
  const goal = cat.goal || 10;
  const isReady = count >= goal;
  const pendingReset = cat.pendingReset || false;
  
  // Sprawdzenie czy to korona
  const wins = cat.wins?.[user] || 0;
  const isCrown = wins >= 3;
  
  // Ustawianie kolorów i klas
  if (pendingReset) {
    // Złota karta po wygranej - pulsuje
    card.classList.add('reward-won');
    if (isCrown) {
      card.classList.add('reward-crown');
    }
  } else {
    // Normalne kolory
    card.style.backgroundColor = cat.color || '#FFB6C1';
    card.style.borderColor = cat.borderColor || '#FF69B4';
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
  
  // Ostatnia nagroda (tylko na złotej karcie po wygranej)
  if (pendingReset && cat.lastReward) {
    const lastReward = document.createElement('div');
    lastReward.className = 'last-reward';
    lastReward.textContent = `🎁 ${cat.lastReward}`;
    card.appendChild(lastReward);
  }
  
  // Obsługa interakcji
  setupCardInteraction(card, cat.id, isReady, pendingReset, count, goal);
  
  return card;
};

// Konfiguracja interakcji z kartą
const setupCardInteraction = (card, categoryId, isReady, pendingReset, currentCount, goal) => {
  let holdTimer = null;
  let fillAnimTimeout = null;
  let isTouchMoved = false;
  let touchStartY = 0;
  const SCROLL_THRESHOLD = 10; // piksele tolerancji na przewijanie
  
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  const startHold = () => {
    card.classList.add('active-hold');
    
    // Wibracja na starcie
    vibrate(50);
    
    if (pendingReset) {
      // Złota animacja dla resetu
      card.classList.add('reset-filling');
    } else {
      // Normalna animacja dodawania
      card.classList.add('filling');
    }
    
    fillAnimTimeout = setTimeout(() => {
      card.classList.remove('filling', 'reset-filling');
      card.classList.add('filling-complete');
    }, 500);
    
    holdTimer = setTimeout(async () => {
      // Wibracja sukcesu
      vibrate([100, 50, 100]);
      
      if (pendingReset) {
        // Reset kategorii
        await resetCategory(categoryId);
      } else {
        // Dodaj kryształek
        const newCount = currentCount + 1;
        await addCrystal(categoryId);
        
        // Jeśli to był ostatni kryształek - natychmiast zmień na złoty i otwórz modal
        if (newCount >= goal) {
          // Wibracja specjalna dla ukończenia
          vibrate([200, 100, 200, 100, 200]);
          
          // Daj chwilę na wizualizację, potem otwórz modal
          setTimeout(() => {
            openRewardModal(categoryId);
          }, 400);
        }
      }
    }, 500);
  };
  
  const cancelHold = () => {
    clearTimeout(holdTimer);
    clearTimeout(fillAnimTimeout);
    card.classList.remove('active-hold', 'filling', 'filling-complete', 'reset-filling');
  };
  
  // Mouse events (desktop)
  card.addEventListener('mousedown', startHold);
  card.addEventListener('mouseup', cancelHold);
  card.addEventListener('mouseleave', cancelHold);
  
  // Touch events (mobile) - z detekcją przewijania
  card.addEventListener('touchstart', (e) => {
    isTouchMoved = false;
    touchStartY = e.touches[0].clientY;
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
    if (!isTouchMoved) {
      e.preventDefault();
      startHold();
      
      // Automatycznie anuluj po 500ms (czas trwania animacji)
      setTimeout(() => {
        cancelHold();
      }, 550);
    }
    isTouchMoved = false;
  });
  
  card.addEventListener('touchcancel', cancelHold);
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
  
  // Zbierz wszystkie unikalne nazwy kategorii
  const categoryNames = [...new Set(categories.map(cat => cat.name))];
  
  // Przygotuj statystyki dla każdej nazwy kategorii
  const categoryStats = categoryNames.map(name => {
    // Znajdź kategorie o tej nazwie
    const catsWithName = categories.filter(cat => cat.name === name);
    
    let maksWins = 0;
    let ninaWins = 0;
    
    catsWithName.forEach(cat => {
      maksWins += cat.wins?.maks || 0;
      ninaWins += cat.wins?.nina || 0;
    });
    
    const total = maksWins + ninaWins;
    const hasBothPlayers = maksWins > 0 && ninaWins > 0;
    const isMaksOnly = maksWins > 0 && ninaWins === 0;
    const isNinaOnly = ninaWins > 0 && maksWins === 0;
    
    return {
      name,
      maksWins,
      ninaWins,
      total,
      hasBothPlayers,
      isMaksOnly,
      isNinaOnly
    };
  });
  
  // Sortuj: najpierw kategorie z rywalizacją, potem osobne, wszystko według aktywności
  categoryStats.sort((a, b) => {
    if (a.hasBothPlayers && !b.hasBothPlayers) return -1;
    if (!a.hasBothPlayers && b.hasBothPlayers) return 1;
    return b.total - a.total;
  });
  
  // Generuj HTML
  const competitiveCategories = categoryStats.filter(cat => cat.hasBothPlayers);
  const maksOnlyCategories = categoryStats.filter(cat => cat.isMaksOnly);
  const ninaOnlyCategories = categoryStats.filter(cat => cat.isNinaOnly);
  
  let html = '';
  
  // Sekcja rywalizacji
  if (competitiveCategories.length > 0) {
    html += '<div class="ranking-section"><h3>🏆 Rywalizacja (kategorie wspólne)</h3>';
    competitiveCategories.forEach(cat => {
      const maksWidth = (cat.maksWins / cat.total) * 100;
      const ninaWidth = (cat.ninaWins / cat.total) * 100;
      
      let winnerBadge = '';
      if (cat.maksWins > cat.ninaWins) {
        winnerBadge = '<span class="winner-badge maks-winner">👑 Maks</span>';
      } else if (cat.ninaWins > cat.maksWins) {
        winnerBadge = '<span class="winner-badge nina-winner">👑 Nina</span>';
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
            <div class="ranking-bar-row">
              <span class="ranking-label maks-label">Maks</span>
              <div class="ranking-bar">
                <div class="ranking-bar-fill maks-bar" style="width: ${maksWidth}%"></div>
              </div>
              <span class="ranking-score">${cat.maksWins}</span>
            </div>
            <div class="ranking-bar-row">
              <span class="ranking-label nina-label">Nina</span>
              <div class="ranking-bar">
                <div class="ranking-bar-fill nina-bar" style="width: ${ninaWidth}%"></div>
              </div>
              <span class="ranking-score">${cat.ninaWins}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Kategorie tylko Maksa
  if (maksOnlyCategories.length > 0) {
    html += '<div class="ranking-section"><h3>🔵 Kategorie Maksa</h3>';
    maksOnlyCategories.forEach(cat => {
      html += `
        <div class="category-ranking-item solo-category">
          <div class="solo-category-row">
            <span class="solo-category-name">${cat.name}</span>
            <span class="solo-category-score maks-score">${cat.maksWins} 🏆</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Kategorie tylko Niny
  if (ninaOnlyCategories.length > 0) {
    html += '<div class="ranking-section"><h3>🔴 Kategorie Niny</h3>';
    ninaOnlyCategories.forEach(cat => {
      html += `
        <div class="category-ranking-item solo-category">
          <div class="solo-category-row">
            <span class="solo-category-name">${cat.name}</span>
            <span class="solo-category-score nina-score">${cat.ninaWins} 🏆</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Ogólny wynik
  const totalMaks = categoryStats.reduce((sum, cat) => sum + cat.maksWins, 0);
  const totalNina = categoryStats.reduce((sum, cat) => sum + cat.ninaWins, 0);
  
  let overallHtml = '';
  if (totalMaks > totalNina) {
    overallHtml = `<div class="overall-winner maks-overall">🏆 Maks prowadzi: ${totalMaks} zwycięstw (Nina: ${totalNina})</div>`;
  } else if (totalNina > totalMaks) {
    overallHtml = `<div class="overall-winner nina-overall">🏆 Nina prowadzi: ${totalNina} zwycięstw (Maks: ${totalMaks})</div>`;
  } else if (totalMaks > 0) {
    overallHtml = `<div class="overall-winner tie-overall">🤝 Remis! Oboje po ${totalMaks} zwycięstw!</div>`;
  }
  
  if (html === '') {
    html = '<div style="text-align:center;padding:2rem;color:#999;">Brak jeszcze zwycięstw. Czas zdobyć pierwsze nagrody! 🎯</div>';
  }
  
  rankingContent.innerHTML = overallHtml + html;
};