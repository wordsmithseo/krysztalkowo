// ===== SYSTEM NAGRÓD =====
import { getRewards, setRewardFlowLock, setPendingCategoryId, randInt, state } from './state.js';
import { finalizeReward } from './database.js';
import { fireConfetti } from './ui.js';

// Elementy DOM
const rewardModal = document.getElementById('rewardModal');
const chestsRow = document.getElementById('chestsRow');
const rewardReveal = document.getElementById('rewardReveal');

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
  
  rewardReveal.textContent = '';
  rewardReveal.innerHTML = '';
  rewardModal.style.display = 'flex';
  
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
  setupChestHandlers(chests, rewards);
};

// Konfiguracja obsługi skrzynek
const setupChestHandlers = (chests, rewards) => {
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
    
    // Wyświetlenie nagrody po 420ms
    setTimeout(() => {
      rewardReveal.innerHTML = `
        ${reward.image ? `<img src="${reward.image}" alt="Nagroda" onerror="this.style.display='none'">` : ''}
        <div style="font-weight:800">Nagroda: ${reward.name}</div>
      `;
    }, 420);
    
    // Finalizacja nagrody po 900ms
    setTimeout(async () => {
      await finalizeReward(state.pendingCategoryId, reward.name);
      setPendingCategoryId(null);
    }, 900);
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

// Zamykanie modala nagród
export const closeRewardModal = () => {
  rewardModal.style.display = 'none';
};