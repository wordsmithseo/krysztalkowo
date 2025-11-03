// ===== SYSTEM NAGRÓD =====
import { getRewards, setRewardFlowLock, setPendingCategoryId, randInt, state, getCategories } from './state.js';
import { finalizeReward, addPendingReward } from './database.js';
import { fireConfetti } from './ui.js';

// Elementy DOM
const rewardModal = document.getElementById('rewardModal');
const chestsRow = document.getElementById('chestsRow');
const rewardReveal = document.getElementById('rewardReveal');
const rewardActions = document.getElementById('rewardActions');
const realizeLaterBtn = document.getElementById('realizeLaterBtn');

let selectedReward = null;

// Otwieranie modala z nagrodami
export const openRewardModal = (categoryId) => {
  const rewards = getRewards();
  
  if (!rewards.length) {
    alert('Brawo! Cel osiągnięty. (Brak zdefiniowanych nagród dla tego profilu) – ustawiam nagrodę „nieustawiona".');
    finalizeReward(categoryId, 'Nagroda nieustawiona');
    return;
  }
  
  setPendingCategoryId(categoryId);
  setRewardFlowLock(false);
  selectedReward = null;
  
  rewardReveal.textContent = '';
  rewardReveal.innerHTML = '';
  rewardActions.style.display = 'none';
  rewardModal.style.display = 'flex';
  
  // Blokada zamykania modala
  blockModalClosing();
  
  // Reset skrzynek
  const chests = rewardModal.querySelectorAll('#chestsRow .reward-chest');
  chests.forEach(chest => {
    chest.classList.remove('opening', 'opened');
    chest.style.pointerEvents = 'auto';
  });
  
  // Losowa kolejność skrzynek
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  Array.from(chestsRow.children).forEach((chest, i) => {
    chest.style.order = order[i];
  });
  
  // Ustawienie obsługi kliknięć
  setupChestHandlers(chests, rewards, categoryId);
};

// Blokada zamykania modala
const blockModalClosing = () => {
  // Usuń przyciski zamykania
  const closeBtn = rewardModal.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.style.display = 'none';
  }
  
  // Zablokuj kliknięcie poza modalem
  rewardModal.onclick = (e) => {
    e.stopPropagation();
  };
};

// Odblokowanie zamykania modala
const unblockModalClosing = () => {
  // Przywróć przycisk zamykania
  const closeBtn = rewardModal.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.style.display = 'block';
  }
  
  // Przywróć możliwość zamknięcia kliknięciem poza modalem
  rewardModal.onclick = (e) => {
    if (e.target === rewardModal) {
      closeRewardModal();
    }
  };
};

// Konfiguracja obsługi skrzynek
const setupChestHandlers = (chests, rewards, categoryId) => {
  const onPick = async (e) => {
    if (state.rewardFlowLock) return;
    
    const chest = e.currentTarget;
    setRewardFlowLock(true);
    
    chest.classList.add('opening');
    chests.forEach(c => {
      c.style.pointerEvents = 'none';
    });
    
    // Konfetti po 250ms
    setTimeout(() => {
      fireConfetti();
    }, 250);
    
    // Otwarcie skrzynki po 600ms
    setTimeout(() => {
      chest.classList.remove('opening');
      chest.classList.add('opened');
    }, 600);
    
    // Losowanie nagrody
    const reward = rewards[randInt(0, rewards.length - 1)];
    selectedReward = reward;
    
    // Wyświetlenie nagrody po 420ms
    setTimeout(() => {
      let imageHtml = '';
      if (reward.image) {
        imageHtml = `<img src="${reward.image}" alt="Nagroda" style="max-width:12rem;max-height:12rem;border-radius:0.75rem;box-shadow:0 6px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none'">`;
      }
      
      rewardReveal.innerHTML = `
        ${imageHtml}
        <div style="font-weight:800;font-size:1.5rem;margin-top:1rem">🎁 ${reward.name}</div>
      `;
      
      // Pokaż przyciski akcji
      rewardActions.style.display = 'flex';
    }, 420);
  };
  
  chests.forEach(chest => {
    chest.onclick = null;
    chest.addEventListener('click', onPick, { once: true });
    chest.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        chest.click();
      }
    });
  });
};

// Obsługa przycisku "Zrealizuj później"
if (realizeLaterBtn) {
  realizeLaterBtn.addEventListener('click', async () => {
    if (!selectedReward || !state.pendingCategoryId) return;
    
    realizeLaterBtn.disabled = true;
    realizeLaterBtn.textContent = 'Zapisywanie...';
    
    // Pobierz nazwę kategorii
    const categories = getCategories();
    const category = categories.find(c => c.id === state.pendingCategoryId);
    const categoryName = category ? category.name : 'Nieznana kategoria';
    
    const success = await addPendingReward(
      state.pendingCategoryId, 
      categoryName,
      selectedReward.name
    );
    
    if (success) {
      setPendingCategoryId(null);
      selectedReward = null;
      
      // Odblokuj zamykanie modala
      unblockModalClosing();
      
      // Pokaż komunikat sukcesu
      rewardReveal.innerHTML = `
        <div style="font-size:2rem;margin-bottom:1rem;">✅</div>
        <div style="font-weight:700;font-size:1.3rem;">Nagroda zapisana!</div>
        <div style="font-size:1rem;margin-top:0.5rem;opacity:0.8;">Znajdziesz ją w "Zaległe nagrody"</div>
      `;
      rewardActions.style.display = 'none';
      
      // Automatycznie zamknij modal po 2 sekundach
      setTimeout(() => {
        closeRewardModal();
      }, 2000);
    } else {
      alert('❌ Błąd zapisywania nagrody!');
      realizeLaterBtn.disabled = false;
      realizeLaterBtn.textContent = '📋 Zrealizuj później';
    }
  });
}

// Zamykanie modala nagród
export const closeRewardModal = () => {
  rewardModal.style.display = 'none';
  selectedReward = null;
  rewardActions.style.display = 'none';
  
  // Przywróć normalny stan modala
  const closeBtn = rewardModal.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.style.display = 'block';
  }
};