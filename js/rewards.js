// ===== SYSTEM NAGRÓD =====
import { getRewards, setRewardFlowLock, setPendingCategoryId, randInt, state, getCategories, getCurrentUser } from './state.js';
import { finalizeReward, addPendingReward, markCategoryPendingReset } from './database.js';
import { fireConfetti } from './ui.js';
import { getRarityClass, getRarityName } from './admin.js';

// Elementy DOM
const rewardModal = document.getElementById('rewardModal');
const chestsRow = document.getElementById('chestsRow');
const rewardReveal = document.getElementById('rewardReveal');
const rewardActions = document.getElementById('rewardActions');
const realizeLaterBtn = document.getElementById('realizeLaterBtn');

let selectedReward = null;

// Flaga czy modal o braku nagród został już wyświetlony dla danego dziecka w tej sesji
const noRewardsShownForChild = new Set();

// Funkcja czyszcząca cache wyświetlonych modali o braku nagród
export const clearNoRewardsCache = () => {
  noRewardsShownForChild.clear();
  console.log('🧹 Cache modali o braku nagród wyczyszczony');
};

// Funkcja losowania ważonego - uwzględnia prawdopodobieństwo wylosowania nagród
const weightedRandomReward = (rewards) => {
  // Jeśli brak nagród, zwróć null
  if (!rewards || rewards.length === 0) {
    return null;
  }

  // Jeśli jest tylko jedna nagroda, zwróć ją
  if (rewards.length === 1) {
    return rewards[0];
  }

  // Oblicz sumę wszystkich prawdopodobieństw (wag)
  const totalWeight = rewards.reduce((sum, reward) => {
    const prob = reward.probability || 50; // Domyślnie 50%
    return sum + prob;
  }, 0);

  // Jeśli suma wag wynosi 0, użyj równego prawdopodobieństwa
  if (totalWeight === 0) {
    return rewards[randInt(0, rewards.length - 1)];
  }

  // Wylosuj liczbę z zakresu [0, totalWeight)
  let random = Math.random() * totalWeight;

  console.log(`🎲 Losowanie ważone: totalWeight=${totalWeight.toFixed(2)}, random=${random.toFixed(2)}`);

  // Przejdź przez nagrody i znajdź tę, która "zawiera" wylosowaną liczbę
  for (let i = 0; i < rewards.length; i++) {
    const reward = rewards[i];
    const weight = reward.probability || 50;

    console.log(`  🎁 Nagroda "${reward.name}": waga=${weight}%, pozostało=${random.toFixed(2)}`);

    if (random < weight) {
      console.log(`  ✅ Wybrano: "${reward.name}" (prawdopodobieństwo ${weight}%)`);
      return reward;
    }

    random -= weight;
  }

  // Fallback (nie powinno się zdarzyć, ale dla bezpieczeństwa)
  console.log('⚠️ Fallback: zwracam ostatnią nagrodę');
  return rewards[rewards.length - 1];
};

// Funkcja pokazująca modal o braku nagród
const showNoRewardsModal = (categoryId) => {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="text-align: center; max-width: 400px;">
        <h2>🎉 Brawo! Cel osiągnięty!</h2>
        <p style="margin: 1.5rem 0;">Brak zdefiniowanych nagród dla tego profilu.</p>
        <p style="margin: 1.5rem 0;">Ustawiam nagrodę „nieustawiona".</p>
        <button id="noRewardsOkBtn" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem;">OK</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('noRewardsOkBtn').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
  });
};

// Otwieranie modala z nagrodami
export const openRewardModal = async (categoryId, drawId = null) => {
  const rewards = getRewards();
  const currentUser = getCurrentUser();
  const categories = getCategories();
  const category = categories.find(c => c.id === categoryId);

  if (!rewards.length) {
    // Sprawdź czy modal został już wyświetlony dla tego dziecka
    if (!noRewardsShownForChild.has(currentUser)) {
      noRewardsShownForChild.add(currentUser);
      await showNoRewardsModal(categoryId);
    }
    // pendingReset zostanie ustawiony w finalizeReward
    finalizeReward(categoryId, 'Nagroda nieustawiona');
    return;
  }

  // Użyj przekazanego drawId lub pobierz z kategorii
  const activeDrawId = drawId || (category ? category.drawId : null);

  console.log('🎰 openRewardModal - categoryId:', categoryId, 'drawId param:', drawId, 'activeDrawId:', activeDrawId);
  console.log('🎰 Category object:', category);

  setPendingCategoryId(categoryId);
  setRewardFlowLock(false);
  selectedReward = null;

  rewardReveal.textContent = '';
  rewardReveal.innerHTML = '';
  rewardActions.style.display = 'none';
  rewardModal.style.display = 'flex';

  // Wyświetl ID losowania na modalu
  const drawIdDisplay = document.getElementById('drawIdDisplay');
  if (drawIdDisplay) {
    drawIdDisplay.textContent = `ID losowania: ${activeDrawId}`;
  }

  // Blokada zamykania modala
  blockModalClosing();

  // Reset skrzynek - USUŃ WSZYSTKIE event listenery
  const chests = rewardModal.querySelectorAll('#chestsRow .reward-chest');
  chests.forEach(chest => {
    chest.classList.remove('opening', 'opened', 'chest-selected', 'chest-unselected');
    chest.style.pointerEvents = 'auto';

    // KLUCZOWE: Sklonuj element aby usunąć wszystkie event listenery
    const newChest = chest.cloneNode(true);
    chest.parentNode.replaceChild(newChest, chest);
  });

  // Po sklonowaniu pobierz nowe referencje
  const freshChests = rewardModal.querySelectorAll('#chestsRow .reward-chest');

  // Losowa kolejność skrzynek
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  Array.from(chestsRow.children).forEach((chest, i) => {
    chest.style.order = order[i];
  });

  // Ustawienie obsługi kliknięć - przekaż activeDrawId i ŚWIEŻE elementy
  setupChestHandlers(freshChests, rewards, categoryId, activeDrawId);
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
const setupChestHandlers = (chests, rewards, categoryId, drawId) => {
  console.log('🎁 setupChestHandlers wywoła się dla categoryId:', categoryId, 'drawId:', drawId);

  // Pobierz nazwę kategorii
  const categories = getCategories();
  const category = categories.find(c => c.id === categoryId);
  const categoryName = category ? category.name : 'Nieznana kategoria';

  console.log('📋 Znaleziona kategoria:', category ? category.name : 'BRAK', 'ID:', categoryId);

  chests.forEach((chest, index) => {
    const onPick = async () => {
      if (state.rewardFlowLock) return;

      console.log(`🎯 Kliknięto skrzynkę #${index + 1} dla kategorii:`, categoryId);
      setRewardFlowLock(true);

      // Zablokuj wszystkie skrzynki
      chests.forEach(c => {
        c.style.pointerEvents = 'none';
      });

      chest.classList.add('opening');

      // Ustyl niewybrane skrzynki (mniejsze i czarno-białe)
      chests.forEach(c => {
        if (c !== chest) {
          c.classList.add('chest-unselected');
        }
      });

      // Konfetti po 250ms
      setTimeout(() => {
        fireConfetti();
      }, 250);

      // Otwarcie skrzynki po 600ms + powiększenie wybranej
      setTimeout(() => {
        chest.classList.remove('opening');
        chest.classList.add('opened', 'chest-selected');
      }, 600);

      // Losowanie nagrody z uwzględnieniem prawdopodobieństwa
      const reward = weightedRandomReward(rewards);
      selectedReward = reward;

      // Sprawdź czy losowanie się powiodło
      if (!reward) {
        console.error('❌ Błąd losowania nagrody!');
        setRewardFlowLock(false);
        return;
      }

      // Wyświetlenie nagrody po 420ms
      setTimeout(async () => {
        const rarityClass = getRarityClass(reward.probability);
        const rarityName = getRarityName(reward.probability);

        rewardReveal.className = `reward-reveal-content ${rarityClass}`;

        let imageHtml = '';
        if (reward.image) {
          imageHtml = `<img src="${reward.image}" alt="Nagroda" style="max-width:12rem;max-height:12rem;border-radius:0.75rem;box-shadow:0 6px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none'">`;
        }

        rewardReveal.innerHTML = `
          ${imageHtml}
          <div style="font-size:1.1rem;font-weight:600;margin-top:1rem;opacity:0.9;">✨ ${rarityName}</div>
          <div style="font-weight:800;font-size:1.5rem;margin-top:0.5rem">🎁 ${reward.name}</div>
          <div style="font-size:0.9rem;margin-top:1rem;opacity:0.7;">Zapisywanie nagrody...</div>
        `;

        // NIE pokazuj przycisków akcji - automatyczny zapis
        rewardActions.style.display = 'none';

        // Automatycznie zapisz nagrodę do pending rewards po 1.5s
        setTimeout(async () => {
          console.log('💾 Automatyczne zapisywanie nagrody:', { categoryName, rewardName: reward.name, drawId });

          const success = await addPendingReward(
            categoryId,
            categoryName,
            reward.name,
            drawId,
            reward.probability || 50
          );

          if (success) {
            console.log('✅ Nagroda zapisana pomyślnie');

            // Finalizuj nagrodę (zlicz wygraną, ustaw lastReward, pendingReset - BEZ usuwania drawId)
            await finalizeReward(categoryId, reward.name);

            // Pokaż komunikat sukcesu
            rewardReveal.innerHTML = `
              <div style="font-size:2rem;margin-bottom:1rem;">✅</div>
              <div style="font-weight:700;font-size:1.3rem;">Nagroda zapisana!</div>
              <div style="font-size:1rem;margin-top:0.5rem;opacity:0.8;">Znajdziesz ją w "Zaległe nagrody"</div>
            `;

            // Odblokuj zamykanie modala
            unblockModalClosing();

            // Zamknij modal po 1.5s
            setTimeout(() => {
              console.log('🚪 Zamykanie modala dla kategorii:', categoryId);
              closeRewardModal();
              setPendingCategoryId(null);
              selectedReward = null;
              setRewardFlowLock(false);

              // NATYCHMIAST zamień klasę reward-ready na reward-won
              // To zablokuje możliwość ponownego kliknięcia karty i otwarcia modala
              const card = document.querySelector(`[data-category-id="${categoryId}"]`);
              console.log('🔍 Szukam karty z ID:', categoryId, 'Znaleziono:', card ? 'TAK' : 'NIE');
              if (card) {
                card.classList.remove('reward-ready');
                card.classList.add('reward-won');
                console.log('✅ Karta oznaczona jako "reward-won" - zablokowano ponowne losowanie');
              } else {
                console.error('❌ Nie znaleziono karty z categoryId:', categoryId);
              }

              console.log('🕐 Karta zresetuje się za 5 sekund...');

              // PO zamknięciu modala: usuń drawId i zresetuj kartę po 5s z animacją
              setTimeout(async () => {
                console.log('🎬 Rozpoczynam animację i reset karty dla:', categoryId);

                // Znajdź kartę w DOM
                const card = document.querySelector(`[data-category-id="${categoryId}"]`);
                console.log('🔍 Ponowne szukanie karty z ID:', categoryId, 'Znaleziono:', card ? 'TAK' : 'NIE');

                if (card) {
                  // Dodaj animację shake + flash
                  card.classList.add('resetting-animation');
                  console.log('✨ Dodano animację resetu do karty:', categoryId);

                  // Po zakończeniu animacji (1s): usuń drawId i zresetuj kartę
                  setTimeout(async () => {
                    console.log('🔧 Usuwanie drawId i resetowanie kategorii:', categoryId);
                    const { removeDrawId, resetCategory } = await import('./database.js');

                    // Usuń drawId (zielony pasek zniknie)
                    const removeResult = await removeDrawId(categoryId);
                    console.log('🗑️ Wynik removeDrawId:', removeResult, 'dla kategorii:', categoryId);

                    // Zresetuj kartę (zeruj kryształki, randomizuj kolory)
                    await resetCategory(categoryId);
                    console.log('🔄 Wywołano resetCategory dla:', categoryId);

                    // Usuń klasę animacji
                    if (card) {
                      card.classList.remove('resetting-animation');
                      console.log('✅ Usunięto animację resetu z karty:', categoryId);
                    }

                    console.log('🔄 Karta zresetowana i odblokowana:', categoryId);
                  }, 1000);
                } else {
                  console.error('❌ Nie znaleziono karty do zresetowania. categoryId:', categoryId);
                  console.error('❌ Wszystkie karty w DOM:', Array.from(document.querySelectorAll('.category-card')).map(c => c.getAttribute('data-category-id')));
                }
              }, 5000);
            }, 1500);
          } else {
            console.error('❌ Zapis nagrody nie powiódł się');
            rewardReveal.innerHTML = `
              <div style="font-size:2rem;margin-bottom:1rem;">❌</div>
              <div style="font-weight:700;font-size:1.3rem;color:#e74c3c;">Błąd zapisu!</div>
              <div style="font-size:1rem;margin-top:0.5rem;opacity:0.8;">Spróbuj ponownie później</div>
            `;

            setTimeout(() => {
              closeRewardModal();
              setRewardFlowLock(false);
            }, 3000);
          }
        }, 1500);
      }, 420);
    };

    // Dodaj event listenery do ŚWIEŻEGO elementu (bez starych listenerów)
    chest.addEventListener('click', onPick, { once: true });
    chest.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        chest.click();
      }
    });
  });
};

// Przycisk "Zrealizuj później" został usunięty - teraz automatyczny zapis po otwarciu skrzynki

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

  // Zresetuj przycisk "Zrealizuj później"
  if (realizeLaterBtn) {
    realizeLaterBtn.disabled = false;
    realizeLaterBtn.textContent = '📋 Zrealizuj później';
  }
};