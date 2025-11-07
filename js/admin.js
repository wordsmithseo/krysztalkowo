// ===== PANEL ADMINISTRACYJNY =====
import { getCategories, getRewards, getChildren, setIsLoggedIn, state, getCurrentUser, setCurrentUser } from './state.js';
import {
  addCategory,
  deleteCategory,
  updateCategory,
  updateCategoryOrder,
  addReward,
  deleteReward,
  updateReward,
  setAvatar,
  modifyCrystalCount,
  resetAllRankings,
  addChild,
  updateChild,
  updateChildOrder,
  deleteChild,
  changeUserPassword,
  getSuggestedCategories,
  getSuggestedRewards,
  getCategoryImagesFromOtherChildren,
  getRewardImagesFromOtherChildren
} from './database.js';
import { getCurrentAuthUser } from './auth.js';
import { uploadImage, compressImage, getAllUserImages, deleteImageByUrl } from './storage.js';
import { db } from './config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const categoryList = document.getElementById('categoryList');
const childrenListEl = document.getElementById('childrenList');
const rewardList = document.getElementById('rewardList');

let sortableInstance = null;
let sortableChildrenInstance = null;

export const initializeSortable = () => {
  // Sortable dla kategorii
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  if (categoryList) {
    sortableInstance = Sortable.create(categoryList, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: async (evt) => {
        const items = Array.from(categoryList.children);

        const updates = items.map((item, index) => {
          const id = item.dataset.id;
          return updateCategoryOrder(id, index);
        });

        await Promise.all(updates);
      }
    });
  }

  // Sortable dla dzieci
  if (sortableChildrenInstance) {
    sortableChildrenInstance.destroy();
  }

  if (childrenListEl) {
    sortableChildrenInstance = Sortable.create(childrenListEl, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: async (evt) => {
        const items = Array.from(childrenListEl.children);

        const updates = items.map((item, index) => {
          const id = item.dataset.id;
          return updateChildOrder(id, index);
        });

        await Promise.all(updates);
      }
    });
  }
};

export const updateAdminHeaderInfo = () => {
  const user = getCurrentAuthUser();
  const currentUserId = getCurrentUser();
  const children = getChildren();
  const currentChild = children.find(c => c.id === currentUserId);
  
  const adminUserEmail = document.getElementById('adminUserEmail');
  const adminCurrentChild = document.getElementById('adminCurrentChild');
  
  if (adminUserEmail && user) {
    adminUserEmail.textContent = user.email || 'Brak danych';
  }
  
  if (adminCurrentChild && currentChild) {
    const genderIcon = currentChild.gender === 'male' ? '👦' : '👧';
    adminCurrentChild.textContent = `${genderIcon} ${currentChild.name}`;
  } else if (adminCurrentChild) {
    adminCurrentChild.textContent = 'Nie wybrano';
  }
};

const formatLastAddTime = (timestamp) => {
  if (!timestamp) return { text: 'Nigdy nie dodano', full: null };

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Pełna data i godzina dla tooltipa
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const fullDate = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;

  let text;

  // Jeśli mniej niż minutę temu
  if (diff < 60000) {
    text = 'Przed chwilą';
  }
  // Jeśli mniej niż godzinę temu
  else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    text = `${minutes} min temu`;
  }
  // Jeśli mniej niż 24 godziny temu
  else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    text = `${hours}h temu`;
  }
  // Jeśli więcej niż 24 godziny temu - pokaż datę i godzinę
  else {
    text = `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  return { text, full: fullDate };
};

export const renderAdminCategories = () => {
  const categories = getCategories();

  categoryList.innerHTML = categories.map(cat => {
    const lastAddTime = formatLastAddTime(cat.lastAddTimestamp);
    const tooltipAttr = lastAddTime.full ? `title="${lastAddTime.full}"` : '';

    return `
      <li data-id="${cat.id}">
        <div class="left">
          <span class="drag-handle">☰</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span class="name">${cat.name}</span>
            <span class="last-add-time" style="font-size: 0.75rem; color: #999; cursor: help;" ${tooltipAttr}>🕐 Ostatni: ${lastAddTime.text}</span>
          </div>
        </div>
        <div class="category-controls">
          <div class="crystal-controls">
            <button onclick="window.modifyCrystalsHandler('${cat.id}', -1)" title="Odejmij kryształek">−</button>
            <span class="count">${cat.count || 0} / ${cat.goal || 10}</span>
            <button onclick="window.modifyCrystalsHandler('${cat.id}', 1)" title="Dodaj kryształek">+</button>
          </div>
          <div class="action-buttons">
            <button onclick="window.editCategoryHandler('${cat.id}')">✏️</button>
            <button onclick="window.deleteCategoryHandler('${cat.id}')">🗑️</button>
          </div>
        </div>
      </li>
    `;
  }).join('');
};

export const handleModifyCrystals = async (categoryId, delta) => {
  const success = await modifyCrystalCount(categoryId, delta);
  
  if (success) {
    renderAdminCategories();
    initializeSortable();
  }
};

export const renderAdminRewards = () => {
  const rewards = getRewards();

  rewardList.innerHTML = rewards.map(reward => {
    const probability = reward.probability || 50;
    const rarityClass = getRarityClass(probability);
    const frequency = calculateFrequency(probability);

    let imageHtml = '';
    if (reward.image) {
      imageHtml = `
        <div class="reward-preview-wrapper ${rarityClass}">
          <img src="${reward.image}" class="reward-img" alt="${reward.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23f0f0f0%22 rx=%225%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22%3E🎁%3C/text%3E%3C/svg%3E'; this.onerror=null;">
        </div>
      `;
    } else {
      imageHtml = `<div class="reward-img-placeholder">🎁</div>`;
    }

    return `
      <li>
        <div class="reward-left">
          ${imageHtml}
          <div class="reward-info">
            <span class="reward-name">${reward.name}</span>
            <span class="reward-frequency">${frequency || '~1 na 2 losowań'}</span>
          </div>
        </div>
        <div class="action-buttons">
          <button onclick="window.editRewardHandler('${reward.id}')">✏️</button>
          <button onclick="window.deleteRewardHandler('${reward.id}')">🗑️</button>
        </div>
      </li>
    `;
  }).join('');
};

export const renderChildrenList = () => {
  const children = getChildren();
  const childrenList = document.getElementById('childrenList');

  if (!childrenList) return;

  childrenList.innerHTML = children.map(child => `
    <li data-id="${child.id}">
      <div class="child-info">
        <span class="drag-handle">☰</span>
        <span class="child-gender-icon">${child.gender === 'male' ? '👦' : '👧'}</span>
        <span class="child-name">${child.name}</span>
        <span class="child-gender-label">${child.gender === 'male' ? 'Chłopiec' : 'Dziewczynka'}</span>
      </div>
      <div class="action-buttons">
        <button onclick="window.editChildHandler('${child.id}')">✏️</button>
        <button onclick="window.deleteChildHandler('${child.id}')">🗑️</button>
      </div>
    </li>
  `).join('');
};

export const handleAddCategory = async () => {
  const input = document.getElementById('categoryNameInput');
  const name = input.value.trim();

  // Sprawdź czy dziecko jest wybrane
  const children = getChildren();
  if (children.length === 0) {
    alert('⚠️ Najpierw dodaj dziecko!\n\nAby dodać kategorię, musisz najpierw dodać profil dziecka.');
    return;
  }

  if (!getCurrentUser()) {
    alert('⚠️ Najpierw wybierz dziecko!\n\nAby dodać kategorię, musisz najpierw wybrać profil dziecka z górnego menu.');
    return;
  }

  if (!name) {
    alert('Podaj nazwę kategorii!');
    return;
  }

  const success = await addCategory(name);

  if (success) {
    input.value = '';
    renderAdminCategories();
    initializeSortable();
  }
};

export const handleDeleteCategory = async (categoryId) => {
  showConfirmModal(
    'Usuwanie kategorii',
    'Czy na pewno chcesz usunąć tę kategorię? Tej operacji nie można cofnąć.',
    async () => {
      const success = await deleteCategory(categoryId);
      if (success) {
        renderAdminCategories();
        initializeSortable();
      }
    }
  );
};

export const handleEditCategory = (categoryId) => {
  const categories = getCategories();
  const cat = categories.find(c => c.id === categoryId);

  if (!cat) return;

  document.getElementById('editCategoryName').value = cat.name || '';
  document.getElementById('editCategoryGoal').value = cat.goal || 10;

  // Pokaż podgląd aktualnego obrazka
  const currentImagePreview = document.getElementById('currentCategoryImagePreview');
  if (currentImagePreview) {
    if (cat.image) {
      currentImagePreview.innerHTML = `
        <div style="padding: 0.75rem; background: #f5f5f5; border-radius: 0.5rem; border: 2px solid #ddd;">
          <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: #666;">Aktualny obrazek:</div>
          <img src="${cat.image}" alt="Aktualny obrazek" style="max-width: 150px; max-height: 150px; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.parentElement.innerHTML='<div style=\\'color:#999;padding:1rem;\\'>Nie można załadować obrazka</div>'">
        </div>
      `;
    } else {
      currentImagePreview.innerHTML = '<div style="padding: 0.75rem; background: #f5f5f5; border-radius: 0.5rem; color: #999; font-size: 0.9rem;">Brak obrazka</div>';
    }
  }

  // Wyczyść input file i wybrany obrazek z galerii
  document.getElementById('editCategoryImageFile').value = '';
  selectedImageFromGallery = null;

  // Wyświetl aktualną liczbę kryształków i maksimum
  const currentCount = cat.count || 0;
  const currentGoal = cat.goal || 10;
  const currentCrystalsInfo = document.getElementById('currentCrystalsInfo');
  if (currentCrystalsInfo) {
    currentCrystalsInfo.innerHTML = `
      💎 Postęp: <strong>${currentCount} / ${currentGoal}</strong> kryształków<br>
      <span class="crystals-info-note">
        (Maksimum obecnie wynosi: <strong>${currentGoal}</strong>)
      </span>
    `;
  }

  editModal.dataset.editingId = categoryId;

  renderImagePreviews(cat.image);

  adminModal.style.display = 'none';
  editModal.style.display = 'flex';
};

export const handleSaveEdit = async () => {
  const categoryId = editModal.dataset.editingId;

  const saveBtn = document.getElementById('saveEditBtn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Zapisywanie...';

  try {
    const imageFile = document.getElementById('editCategoryImageFile').files[0];

    // Pobierz aktualny obrazek z kategorii
    const categories = getCategories();
    const currentCategory = categories.find(c => c.id === categoryId);
    let imageUrl = currentCategory?.image || '';

    // Jeśli wybrano nowy plik, uploaduj go
    if (imageFile) {
      saveBtn.textContent = 'Przesyłanie obrazka...';

      // Skompresuj obrazek przed uploadem
      const compressedFile = await compressImage(imageFile);
      const uploadResult = await uploadImage(compressedFile, 'category');

      if (!uploadResult.success) {
        alert(`Błąd podczas przesyłania obrazka: ${uploadResult.error}`);
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }

      imageUrl = uploadResult.url;
    } else if (selectedImageFromGallery) {
      // Jeśli nie wybrano nowego pliku, ale wybrano obrazek z galerii
      imageUrl = selectedImageFromGallery;
    }

    const data = {
      name: document.getElementById('editCategoryName').value.trim(),
      goal: parseInt(document.getElementById('editCategoryGoal').value) || 10,
      image: imageUrl
    };

    if (!data.name) {
      alert('Nazwa nie może być pusta!');
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return;
    }

    saveBtn.textContent = 'Zapisywanie danych...';
    const success = await updateCategory(categoryId, data);

    if (success) {
      editModal.style.display = 'none';
      adminModal.style.display = 'flex';
      renderAdminCategories();
      initializeSortable();
      updateAdminHeaderInfo();

      // Wyczyść input pliku i wybrany obrazek z galerii
      document.getElementById('editCategoryImageFile').value = '';
      selectedImageFromGallery = null;
    }
  } catch (error) {
    console.error('Błąd podczas zapisywania:', error);
    alert('Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
};

// Zmienne przechowujące wybrany obrazek z galerii
let selectedImageFromGallery = null;
let selectedRewardImageFromGallery = null;

const renderImagePreviews = async (currentImage) => {
  const previewContainer = document.getElementById('imagePreviewsEdit');

  // Pobierz wszystkie obrazki użytkownika z Firebase Storage
  const result = await getAllUserImages();
  const uploadedImages = result.success ? result.images.map(img => img.url) : [];

  // Pobierz obrazki z innych dzieci na tym koncie
  const currentChildId = getCurrentUser();
  const otherChildrenImages = await getCategoryImagesFromOtherChildren(currentChildId);

  let html = '';

  // Jeśli są wgrane obrazki, pokaż je w galerii
  if (uploadedImages.length > 0) {
    html += '<div class="image-section">';
    html += '<div class="image-section-title image-section-title-highlight">📷 Galeria wgranych obrazków:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij obrazek aby go użyć, lub wgraj nowy plik powyżej</div>';
    html += '<div class="image-previews">';
    html += uploadedImages.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedImageFromGallery ? 'selected' : ''}" onclick="window.selectImageHandler('${url}')" alt="Preview" style="cursor: pointer;">`
    ).join('');
    html += '</div></div>';
  } else {
    html += '<div class="image-section">';
    html += '<div style="font-size: 0.9rem; color: #999; padding: 1rem; text-align: center;">Brak wgranych obrazków. Wgraj pierwszy obrazek używając pola powyżej.</div>';
    html += '</div>';
  }

  // Dodaj obrazki z innych dzieci na tym koncie
  if (otherChildrenImages.length > 0) {
    html += '<div class="image-section" style="margin-top: 1rem;">';
    html += '<div class="image-section-title" style="color: #6a11cb;">💡 Obrazki z innych profili na tym koncie:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij obrazek aby go użyć</div>';
    html += '<div class="image-previews">';
    html += otherChildrenImages.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedImageFromGallery ? 'selected' : ''}" onclick="window.selectImageHandler('${url}')" alt="Preview z innych profili" style="cursor: pointer;">`
    ).join('');
    html += '</div></div>';
  }

  previewContainer.innerHTML = html;
};

export const handleSelectImage = (url) => {
  selectedImageFromGallery = url;
  // Wyczyść pole file input jeśli użytkownik wybrał obrazek z galerii
  const fileInput = document.getElementById('editCategoryImageFile');
  if (fileInput) {
    fileInput.value = '';
  }
  // Odśwież widok galerii aby pokazać wybrany obrazek
  renderImagePreviews();
};

const renderRewardImagePreviews = async () => {
  const previewContainer = document.getElementById('imagePreviewsReward');

  // Pobierz wszystkie obrazki użytkownika z Firebase Storage
  const result = await getAllUserImages();
  const uploadedImages = result.success ? result.images.map(img => img.url) : [];

  // Pobierz obrazki nagród z innych dzieci na tym koncie
  const currentChildId = getCurrentUser();
  const otherChildrenImages = await getRewardImagesFromOtherChildren(currentChildId);

  let html = '';

  // Jeśli są wgrane obrazki, pokaż je w galerii
  if (uploadedImages.length > 0) {
    html += '<div class="image-section">';
    html += '<div class="image-section-title image-section-title-highlight">📷 Galeria wgranych obrazków:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij obrazek aby go użyć, lub wgraj nowy plik powyżej</div>';
    html += '<div class="image-previews">';
    html += uploadedImages.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedRewardImageFromGallery ? 'selected' : ''}" onclick="window.selectRewardImageHandler('${url}')" alt="Preview" style="cursor: pointer;">`
    ).join('');
    html += '</div></div>';
  } else {
    html += '<div class="image-section">';
    html += '<div style="font-size: 0.9rem; color: #999; padding: 1rem; text-align: center;">Brak wgranych obrazków. Wgraj pierwszy obrazek używając pola powyżej.</div>';
    html += '</div>';
  }

  // Dodaj obrazki z innych dzieci na tym koncie
  if (otherChildrenImages.length > 0) {
    html += '<div class="image-section" style="margin-top: 1rem;">';
    html += '<div class="image-section-title" style="color: #6a11cb;">💡 Obrazki z innych profili na tym koncie:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij obrazek aby go użyć</div>';
    html += '<div class="image-previews">';
    html += otherChildrenImages.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedRewardImageFromGallery ? 'selected' : ''}" onclick="window.selectRewardImageHandler('${url}')" alt="Preview z innych profili" style="cursor: pointer;">`
    ).join('');
    html += '</div></div>';
  }

  previewContainer.innerHTML = html;
};

export const handleSelectRewardImage = (url) => {
  selectedRewardImageFromGallery = url;
  // Wyczyść pole file input jeśli użytkownik wybrał obrazek z galerii
  const fileInput = document.getElementById('editRewardImageFile');
  if (fileInput) {
    fileInput.value = '';
  }
  // Odśwież widok galerii aby pokazać wybrany obrazek
  renderRewardImagePreviews();
};

export const handleAddReward = async () => {
  const input = document.getElementById('rewardNameInput');
  const name = input.value.trim();

  // Sprawdź czy dziecko jest wybrane
  if (!getCurrentUser()) {
    alert('⚠️ Najpierw wybierz dziecko!\n\nAby dodać nagrodę, musisz najpierw dodać dziecko i wybrać jego profil.');
    return;
  }

  if (!name) {
    alert('Podaj nazwę nagrody!');
    return;
  }

  const success = await addReward(name);
  
  if (success) {
    input.value = '';
    renderAdminRewards();
  }
};

export const handleDeleteReward = async (rewardId) => {
  showConfirmModal(
    'Usuwanie nagrody',
    'Czy na pewno chcesz usunąć tę nagrodę? Tej operacji nie można cofnąć.',
    async () => {
      const success = await deleteReward(rewardId);
      if (success) {
        renderAdminRewards();
      }
    }
  );
};

// Pomocnicze funkcje dla rzadkości nagród
export const getRarityClass = (probability) => {
  if (!probability || probability >= 60) return 'rarity-common';
  if (probability >= 30) return 'rarity-uncommon';
  if (probability >= 10) return 'rarity-rare';
  if (probability >= 1) return 'rarity-epic';
  return 'rarity-legendary';
};

export const getRarityName = (probability) => {
  if (!probability || probability >= 60) return 'Częsta';
  if (probability >= 30) return 'Rzadsza';
  if (probability >= 10) return 'Rzadka';
  if (probability >= 1) return 'Epicka';
  return 'Legendarna';
};

export const calculateFrequency = (probability) => {
  if (!probability || probability <= 0) return '';
  const frequency = Math.round(100 / probability);
  if (frequency > 1000) {
    return `~1 na ${(frequency / 1000).toFixed(1)}k losowań`;
  }
  return `~1 na ${frequency} losowań`;
};

// Funkcja edycji nagrody
export const handleEditReward = (rewardId) => {
  const rewards = getRewards();
  const reward = rewards.find(r => r.id === rewardId);

  if (!reward) return;

  const editRewardModal = document.getElementById('editRewardModal');
  const adminModal = document.getElementById('adminModal');

  document.getElementById('editRewardName').value = reward.name || '';
  document.getElementById('editRewardProbability').value = reward.probability || 50;

  // Pokaż podgląd aktualnego obrazka z obramówką rzadkości
  const currentImagePreview = document.getElementById('currentRewardImagePreview');
  if (currentImagePreview) {
    if (reward.image) {
      const rarityClass = getRarityClass(reward.probability || 50);
      currentImagePreview.innerHTML = `
        <div style="padding: 0.75rem; background: #f5f5f5; border-radius: 0.5rem; border: 2px solid #ddd;">
          <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: #666;">Aktualny obrazek z obramówką rzadkości:</div>
          <div class="reward-preview-wrapper ${rarityClass}" id="rarityPreviewWrapper" style="display: inline-block;">
            <img src="${reward.image}" class="reward-img" alt="Aktualny obrazek" style="max-width: 150px; max-height: 150px; border-radius: 0.5rem;" onerror="this.parentElement.innerHTML='<div style=\\'color:#999;padding:1rem;\\'>Nie można załadować obrazka</div>'">
          </div>
        </div>
      `;
    } else {
      currentImagePreview.innerHTML = '<div style="padding: 0.75rem; background: #f5f5f5; border-radius: 0.5rem; color: #999; font-size: 0.9rem;">Brak obrazka</div>';
    }
  }

  // Wyczyść input file i wybrany obrazek z galerii
  document.getElementById('editRewardImageFile').value = '';
  selectedRewardImageFromGallery = null;

  // Zapisz ID edytowanej nagrody
  editRewardModal.dataset.editingId = rewardId;

  // Wyświetl galerię obrazków
  renderRewardImagePreviews();

  // Zaktualizuj informacje o częstotliwości
  updateProbabilityInfo();

  adminModal.style.display = 'none';
  editRewardModal.style.display = 'flex';
};

// Funkcja zapisywania edycji nagrody
export const handleSaveRewardEdit = async () => {
  const editRewardModal = document.getElementById('editRewardModal');
  const rewardId = editRewardModal.dataset.editingId;

  const saveBtn = document.querySelector('#editRewardModal .submit-btn');
  const originalText = saveBtn ? saveBtn.textContent : 'Zapisz';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Zapisywanie...';
  }

  try {
    const imageFile = document.getElementById('editRewardImageFile').files[0];

    // Pobierz aktualny obrazek z nagrody
    const rewards = getRewards();
    const currentReward = rewards.find(r => r.id === rewardId);
    let imageUrl = currentReward?.image || '';

    // Jeśli wybrano nowy plik, uploaduj go
    if (imageFile) {
      if (saveBtn) saveBtn.textContent = 'Przesyłanie obrazka...';

      // Skompresuj obrazek przed uploadem
      const compressedFile = await compressImage(imageFile);
      const uploadResult = await uploadImage(compressedFile, 'reward');

      if (!uploadResult.success) {
        alert(`Błąd podczas przesyłania obrazka: ${uploadResult.error}`);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
        return;
      }

      imageUrl = uploadResult.url;
    } else if (selectedRewardImageFromGallery) {
      // Jeśli nie wybrano nowego pliku, ale wybrano obrazek z galerii
      imageUrl = selectedRewardImageFromGallery;
    }

    const data = {
      name: document.getElementById('editRewardName').value.trim(),
      image: imageUrl,
      probability: parseFloat(document.getElementById('editRewardProbability').value) || 50
    };

    if (!data.name) {
      alert('Nazwa nie może być pusta!');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
      return;
    }

    if (data.probability < 0.01 || data.probability > 100) {
      alert('Szansa musi być między 0.01% a 100%!');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
      return;
    }

    if (saveBtn) saveBtn.textContent = 'Zapisywanie danych...';
    const success = await updateReward(rewardId, data);

    if (success) {
      editRewardModal.style.display = 'none';
      const adminModal = document.getElementById('adminModal');
      adminModal.style.display = 'flex';
      renderAdminRewards();

      // Wyczyść input pliku i wybrany obrazek z galerii
      document.getElementById('editRewardImageFile').value = '';
      selectedRewardImageFromGallery = null;
    }
  } catch (error) {
    console.error('Błąd podczas zapisywania nagrody:', error);
    alert('Wystąpił błąd podczas zapisywania. Spróbuj ponownie.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
};


// Funkcja aktualizacji informacji o częstotliwości i obramówki rzadkości
export const updateProbabilityInfo = () => {
  const probability = parseFloat(document.getElementById('editRewardProbability').value) || 0;
  const probabilityInfo = document.getElementById('probabilityInfo');

  if (probability <= 0 || probability > 100) {
    probabilityInfo.className = 'probability-info empty';
    probabilityInfo.textContent = 'Wprowadź wartość między 1% a 100%';
    return;
  }

  const frequency = calculateFrequency(probability);
  const rarityName = getRarityName(probability);
  const rarityClass = getRarityClass(probability);
  probabilityInfo.className = `probability-info ${rarityClass}`;
  probabilityInfo.innerHTML = `📊 ${frequency} <span style="font-weight:400;opacity:0.8;">(${probability}% szansy - ${rarityName})</span>`;

  // Update obramówki rzadkości w czasie rzeczywistym
  const rarityPreviewWrapper = document.getElementById('rarityPreviewWrapper');
  if (rarityPreviewWrapper) {
    rarityPreviewWrapper.className = `reward-preview-wrapper ${rarityClass}`;
  }
};

export const handleResetRanking = () => {
  const resetPasswordModal = document.getElementById('resetRankingPasswordModal');
  const resetPasswordInput = document.getElementById('resetRankingPasswordInput');

  if (resetPasswordModal && resetPasswordInput) {
    resetPasswordInput.value = '';
    resetPasswordModal.style.display = 'flex';
    resetPasswordInput.focus();
  }
};

export const setLoggedInUi = (isLoggedIn) => {
  const adminBtn = document.getElementById('adminBtn');
  
  if (isLoggedIn) {
    adminBtn.classList.add('logged-in');
  } else {
    adminBtn.classList.remove('logged-in');
  }
  
  setIsLoggedIn(isLoggedIn);
};

export const handleSetAvatar = async () => {
  const input = document.getElementById('avatarFileInput');
  const file = input.files[0];

  // Sprawdź czy wybrano plik lub obrazek z galerii
  if (!file && !selectedAvatarFromGallery) {
    alert('Wybierz plik obrazka lub obrazek z galerii!');
    return;
  }

  // Pobierz obecnie wybrane dziecko
  const currentUserId = getCurrentUser();
  const children = getChildren();
  const currentChild = children.find(c => c.id === currentUserId);

  if (!currentChild) {
    alert('Wybierz dziecko, dla którego chcesz ustawić avatar!');
    return;
  }

  const setAvatarBtn = document.getElementById('setAvatarBtn');
  const originalText = setAvatarBtn.textContent;
  setAvatarBtn.disabled = true;
  setAvatarBtn.textContent = 'Ustawianie...';

  try {
    let avatarUrl;

    if (selectedAvatarFromGallery) {
      // Użyj obrazka z galerii
      avatarUrl = selectedAvatarFromGallery;
    } else {
      // Upload nowego pliku
      const compressedFile = await compressImage(file);
      const uploadResult = await uploadImage(compressedFile, 'avatar');

      if (!uploadResult.success) {
        alert(`Błąd podczas przesyłania obrazka: ${uploadResult.error}`);
        setAvatarBtn.disabled = false;
        setAvatarBtn.textContent = originalText;
        return;
      }

      avatarUrl = uploadResult.url;
    }

    const success = await setAvatar(currentUserId, avatarUrl);

    if (success) {
      input.value = '';
      selectedAvatarFromGallery = null;
      alert(`Avatar dla ${currentChild.name} został zaktualizowany!`);
      // Odśwież przyciski użytkowników, aby pokazać nowy avatar
      if (window.updateUserButtons) {
        window.updateUserButtons();
      }
      // Wyczyść podgląd
      const previewContainer = document.getElementById('avatarImagePreviews');
      if (previewContainer) {
        previewContainer.innerHTML = '';
      }
    }
  } catch (error) {
    console.error('Błąd podczas ustawiania avatara:', error);
    alert('Wystąpił błąd podczas ustawiania avatara. Spróbuj ponownie.');
  } finally {
    setAvatarBtn.disabled = false;
    setAvatarBtn.textContent = originalText;
  }
};

// Zarządzanie dziećmi
export const openAddChildModal = () => {
  const modal = document.getElementById('childModal');
  const modalTitle = modal.querySelector('h2');
  
  modalTitle.textContent = 'Dodaj dziecko';
  document.getElementById('childName').value = '';
  document.getElementById('childGenderMale').checked = true;
  
  modal.dataset.editingId = '';
  modal.style.display = 'flex';
};

export const openEditChildModal = (childId) => {
  const children = getChildren();
  const child = children.find(c => c.id === childId);
  
  if (!child) return;
  
  const modal = document.getElementById('childModal');
  const modalTitle = modal.querySelector('h2');
  
  modalTitle.textContent = 'Edytuj dziecko';
  document.getElementById('childName').value = child.name;
  
  if (child.gender === 'male') {
    document.getElementById('childGenderMale').checked = true;
  } else {
    document.getElementById('childGenderFemale').checked = true;
  }
  
  modal.dataset.editingId = childId;
  modal.style.display = 'flex';
};

export const handleSaveChild = async () => {
  const modal = document.getElementById('childModal');
  const childId = modal.dataset.editingId;
  const name = document.getElementById('childName').value.trim();
  const gender = document.getElementById('childGenderMale').checked ? 'male' : 'female';

  if (!name) {
    alert('Podaj imię dziecka!');
    return;
  }

  let success;
  let newChildId = null;

  if (childId) {
    // Edycja istniejącego dziecka
    success = await updateChild(childId, { name, gender });
  } else {
    // Dodawanie nowego dziecka
    newChildId = await addChild(name, gender);
    success = newChildId !== null;
  }

  if (success) {
    modal.style.display = 'none';
    renderChildrenList();

    // Automatycznie wybierz nowo utworzone dziecko
    if (newChildId) {
      setTimeout(() => {
        setCurrentUser(newChildId);
        console.log('✅ Automatycznie wybrano nowo utworzone dziecko:', name);

        // Odśwież UI
        if (window.updateUserButtons) {
          window.updateUserButtons();
        }
      }, 300);
    }
  }
};

export const handleDeleteChild = async (childId) => {
  const children = getChildren();
  const child = children.find(c => c.id === childId);

  if (!child) return;

  showConfirmModal(
    'Usuwanie dziecka',
    `Czy na pewno chcesz usunąć profil dziecka "${child.name}"?\n\nSpowoduje to usunięcie wszystkich kategorii i danych tego dziecka.\n\nTej operacji nie można cofnąć!`,
    async () => {
      const currentUserId = getCurrentUser();
      const success = await deleteChild(childId);

      if (success) {
        // Jeśli usunięte dziecko było aktualnie wybrane, wybierz następne
        if (currentUserId === childId) {
          setTimeout(() => {
            const remainingChildren = getChildren();
            if (remainingChildren.length > 0) {
              // Wybierz pierwsze z pozostałych dzieci
              setCurrentUser(remainingChildren[0].id);
              console.log('✅ Automatycznie wybrano następne dziecko:', remainingChildren[0].name);
            } else {
              // Nie ma więcej dzieci
              setCurrentUser(null);
              console.log('ℹ️ Brak dzieci do wyboru');
            }

            // Odśwież UI
            if (window.updateUserButtons) {
              window.updateUserButtons();
            }
            updateAdminHeaderInfo();
          }, 300);
        }

        renderChildrenList();
        // Odśwież listę przycisków użytkowników
        if (window.updateUserButtons) {
          window.updateUserButtons();
        }
      }
    }
  );
};

// Zmiana hasła konta
export const handleChangePassword = async (newPassword) => {
  try {
    const success = await changeUserPassword(newPassword);
    return success;
  } catch (error) {
    console.error('Błąd zmiany hasła:', error);
    return false;
  }
};

// Modal potwierdzenia wylogowania
export const showLogoutConfirmModal = (onConfirm) => {
  showConfirmModal(
    'Wylogowanie z panelu admina',
    'Czy na pewno chcesz wylogować się z panelu administracyjnego?',
    onConfirm
  );
};

// Modal potwierdzenia
const showConfirmModal = (title, message, onConfirm) => {
  let modal = document.getElementById('confirmModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 28rem; text-align: center; padding: 2rem;">
        <h2 id="confirmTitle" style="margin-top: 0; font-size: 1.5rem; margin-bottom: 1rem;"></h2>
        <p id="confirmMessage" style="font-size: 1rem; margin: 1rem 0 1.5rem 0; white-space: pre-line;"></p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button id="confirmCancelBtn" class="cancel-btn">Anuluj</button>
          <button id="confirmOkBtn" class="submit-btn">Potwierdź</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const modalTitle = modal.querySelector('#confirmTitle');
  const modalMessage = modal.querySelector('#confirmMessage');
  const okBtn = modal.querySelector('#confirmOkBtn');
  const cancelBtn = modal.querySelector('#confirmCancelBtn');
  
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  const closeModal = () => {
    modal.style.display = 'none';
  };
  
  okBtn.onclick = () => {
    closeModal();
    onConfirm();
  };
  
  cancelBtn.onclick = closeModal;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  
  modal.style.display = 'flex';
};

// Renderowanie sugestii kategorii
export const renderCategorySuggestions = async () => {
  const currentChildId = getCurrentUser();
  const suggestionsContainer = document.getElementById('categorySuggestions');

  console.log('🔍 renderCategorySuggestions - currentChildId:', currentChildId);

  if (!suggestionsContainer) {
    console.log('❌ categorySuggestions container not found');
    return;
  }

  const suggestions = await getSuggestedCategories(currentChildId);
  console.log('📋 Znalezione sugestie kategorii:', suggestions);

  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = '';
    console.log('⚠️ Brak sugestii kategorii');
    return;
  }

  suggestionsContainer.innerHTML = `
    <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(106, 17, 203, 0.05); border-radius: 0.75rem; border: 1px solid rgba(106, 17, 203, 0.1);">
      <div style="font-size: 0.85rem; font-weight: 600; color: #6a11cb; margin-bottom: 0.5rem;">💡 Kategorie z innych profili:</div>
      <div class="suggestions-list">
        ${suggestions.map(cat => `
          <button class="suggestion-btn-with-image" onclick="window.fillCategoryFromSuggestion('${cat.name.replace(/'/g, "\\'")}', ${cat.goal}, '${(cat.image || '').replace(/'/g, "\\'")}')">
            ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 0.25rem; margin-right: 0.5rem;">` : ''}
            <span>${cat.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
};

// Renderowanie sugestii nagród
export const renderRewardSuggestions = async () => {
  const currentChildId = getCurrentUser();
  const suggestionsContainer = document.getElementById('rewardSuggestions');

  if (!suggestionsContainer) return;

  const suggestions = await getSuggestedRewards(currentChildId);

  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = '';
    return;
  }

  suggestionsContainer.innerHTML = `
    <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(106, 17, 203, 0.05); border-radius: 0.75rem; border: 1px solid rgba(106, 17, 203, 0.1);">
      <div style="font-size: 0.85rem; font-weight: 600; color: #6a11cb; margin-bottom: 0.5rem;">💡 Nagrody z innych profili:</div>
      <div class="suggestions-list">
        ${suggestions.map(reward => `
          <button class="suggestion-btn-with-image" onclick="window.fillRewardFromSuggestion('${reward.name.replace(/'/g, "\\'")}', '${(reward.image || '').replace(/'/g, "\\'")}', ${reward.probability})">
            ${reward.image ? `<img src="${reward.image}" alt="${reward.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 0.25rem; margin-right: 0.5rem;">` : ''}
            <span>${reward.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
};

// Wypełnianie inputu kategorii z sugestii
export const fillCategoryFromSuggestion = (name, goal, image) => {
  const nameInput = document.getElementById('categoryNameInput');
  if (nameInput) {
    nameInput.value = name;
    nameInput.focus();
  }
};

// Wypełnianie inputu nagrody z sugestii
export const fillRewardFromSuggestion = (name, image, probability) => {
  const nameInput = document.getElementById('rewardNameInput');
  if (nameInput) {
    nameInput.value = name;
    nameInput.focus();
  }
};

// ===== GALERIA OBRAZKÓW =====
export const openGalleryModal = async () => {
  const galleryModal = document.getElementById('galleryModal');
  galleryModal.style.display = 'flex';
  await renderGallery();
};

export const renderGallery = async () => {
  const galleryGrid = document.getElementById('galleryGrid');
  const totalSizeEl = document.getElementById('totalSize');
  const imageCountEl = document.getElementById('imageCount');
  const storageBar = document.getElementById('storageBar');

  // Animowany loader w stylistyce aplikacji
  galleryGrid.innerHTML = `
    <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 1rem;">
      <div class="gallery-loader"></div>
      <div style="color: #666; font-size: 1rem; font-weight: 500;">Ładowanie galerii...</div>
    </div>
  `;

  const result = await getAllUserImages();

  if (!result.success) {
    galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #d32f2f;">Błąd ładowania obrazków</div>';
    return;
  }

  if (result.images.length === 0) {
    galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">Brak wgranych obrazków</div>';
    totalSizeEl.textContent = '0 MB';
    imageCountEl.textContent = '0';
    storageBar.style.width = '0%';
    return;
  }

  // Aktualizuj statystyki
  const totalMB = (result.totalSize / (1024 * 1024)).toFixed(2);
  totalSizeEl.textContent = `${totalMB} MB`;
  imageCountEl.textContent = result.count.toString();

  // Ustaw pasek postępu (na razie bez limitu, więc użyjemy 100MB jako bazę dla wizualizacji)
  const maxVisualization = 100; // MB dla wizualizacji
  const percentage = Math.min((parseFloat(totalMB) / maxVisualization) * 100, 100);
  storageBar.style.width = `${percentage}%`;

  // Renderuj obrazki z lazy loading
  galleryGrid.innerHTML = result.images.map(img => `
    <div class="gallery-item" style="position: relative; border-radius: 0.5rem; overflow: hidden; border: 2px solid #e0e0e0; background: #f5f5f5;">
      <img
        src="${img.url}"
        alt="${img.name}"
        loading="lazy"
        decoding="async"
        style="width: 100%; height: 150px; object-fit: cover; display: block;"
      >
      <div style="position: absolute; top: 0; right: 0; padding: 0.25rem;">
        <button
          onclick="window.handleDeleteImageHandler('${img.url}')"
          style="background: #d32f2f; color: white; border: none; border-radius: 0.25rem; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem; font-weight: 700;"
          title="Usuń obrazek"
        >
          ❌
        </button>
      </div>
      <div style="padding: 0.5rem; font-size: 0.75rem; color: #666; background: rgba(255,255,255,0.9);">
        ${(img.size / 1024).toFixed(1)} KB
      </div>
    </div>
  `).join('');
};

export const handleDeleteImage = async (imageUrl) => {
  if (!confirm('Czy na pewno chcesz usunąć ten obrazek? Tej operacji nie można cofnąć.')) {
    return;
  }

  const result = await deleteImageByUrl(imageUrl);

  if (result.success) {
    alert('Obrazek został usunięty');
    await renderGallery();
  } else {
    alert(`Błąd podczas usuwania obrazka: ${result.error}`);
  }
};

if (typeof window !== 'undefined') {
  window.editCategoryHandler = handleEditCategory;
  window.deleteCategoryHandler = handleDeleteCategory;
  window.selectImageHandler = handleSelectImage;
  window.selectRewardImageHandler = handleSelectRewardImage;
  window.editRewardHandler = handleEditReward;
  window.deleteRewardHandler = handleDeleteReward;
  window.modifyCrystalsHandler = handleModifyCrystals;
  window.editChildHandler = openEditChildModal;
  window.deleteChildHandler = handleDeleteChild;
  window.fillCategoryFromSuggestion = fillCategoryFromSuggestion;
  window.fillRewardFromSuggestion = fillRewardFromSuggestion;
  window.handleDeleteImageHandler = handleDeleteImage;

  // Event listener dla file input - wyczyść wybrany obrazek z galerii gdy wybrano nowy plik
  const categoryFileInput = document.getElementById('editCategoryImageFile');
  if (categoryFileInput) {
    categoryFileInput.addEventListener('change', (e) => {
      if (categoryFileInput.files.length > 0) {
        selectedImageFromGallery = null;

        // Pokazuj podgląd wybranego pliku
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          renderImagePreviews(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const rewardFileInput = document.getElementById('editRewardImageFile');
  if (rewardFileInput) {
    rewardFileInput.addEventListener('change', (e) => {
      if (rewardFileInput.files.length > 0) {
        selectedRewardImageFromGallery = null;

        // Pokazuj podgląd wybranego pliku
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          renderRewardImagePreviews(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Podgląd awatara dziecka
  const avatarFileInput = document.getElementById('avatarFileInput');
  if (avatarFileInput) {
    // Załaduj galerię przy pierwszym fokusie
    avatarFileInput.addEventListener('focus', () => {
      renderAvatarImagePreviews();
    }, { once: true });

    avatarFileInput.addEventListener('change', (e) => {
      if (avatarFileInput.files.length > 0) {
        selectedAvatarFromGallery = null;

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          renderAvatarImagePreviews(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Zmienna dla wybranego awatara z galerii
let selectedAvatarFromGallery = null;

// Funkcja pobierająca wcześniej użyte awatary
const getPreviouslyUsedAvatars = async () => {
  try {
    const user = getCurrentAuthUser();
    if (!user) return [];

    // Pobierz wszystkie dzieci użytkownika
    const childrenRef = ref(db, 'children');
    const childrenSnapshot = await get(childrenRef);
    const childrenData = childrenSnapshot.val();

    if (!childrenData) return [];

    const avatarUrls = new Set(); // Użyj Set aby uniknąć duplikatów

    // Dla każdego dziecka należącego do tego użytkownika
    for (const childId in childrenData) {
      if (childrenData[childId].userId === user.uid) {
        // Pobierz avatarUrl dziecka
        const avatarRef = ref(db, `users/${childId}/profile/avatarUrl`);
        const avatarSnapshot = await get(avatarRef);
        const avatarUrl = avatarSnapshot.val();

        if (avatarUrl) {
          avatarUrls.add(avatarUrl);
        }
      }
    }

    // Konwertuj Set na Array i zwróć
    return Array.from(avatarUrls);
  } catch (error) {
    console.error('Błąd pobierania wcześniej używanych awatarów:', error);
    return [];
  }
};

// Renderowanie podglądu obrazków dla awatara
const renderAvatarImagePreviews = async (localPreview) => {
  const previewContainer = document.getElementById('avatarImagePreviews');
  if (!previewContainer) return;

  // Pobierz wszystkie obrazki użytkownika z Firebase Storage
  const result = await getAllUserImages();
  const uploadedImages = result.success ? result.images.map(img => img.url) : [];

  // Pobierz wcześniej użyte awatary
  const usedAvatars = await getPreviouslyUsedAvatars();

  let html = '';

  // Podgląd lokalnego pliku (jeśli wybrano)
  if (localPreview) {
    html += '<div class="image-section">';
    html += '<div class="image-section-title">Podgląd wybranego pliku:</div>';
    html += '<div class="image-previews">';
    html += `<img src="${localPreview}" class="image-preview" alt="Preview" style="width: 150px; height: 150px; object-fit: cover; border-radius: 50%; border: 3px solid #6a11cb;">`;
    html += '</div></div>';
  }

  // Sekcja z wcześniej używanymi awatarami (PRIORYTET)
  if (usedAvatars.length > 0) {
    html += '<div class="image-section">';
    html += '<div class="image-section-title" style="color: #6a11cb; font-weight: 700;">✨ Wcześniej używane awatary:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij awatar aby go użyć ponownie</div>';
    html += '<div class="image-previews">';
    html += usedAvatars.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedAvatarFromGallery ? 'selected' : ''}" onclick="window.selectAvatarHandler('${url}')" alt="Preview" style="cursor: pointer; width: 120px; height: 120px; object-fit: cover; border-radius: 50%; ${url === selectedAvatarFromGallery ? 'border: 3px solid #6a11cb;' : ''}">`
    ).join('');
    html += '</div></div>';
  }

  // Jeśli są wgrane obrazki, pokaż je w galerii
  if (uploadedImages.length > 0) {
    html += '<div class="image-section">';
    html += '<div class="image-section-title image-section-title-highlight">📷 Galeria wgranych obrazków:</div>';
    html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">Kliknij obrazek aby go użyć</div>';
    html += '<div class="image-previews">';
    html += uploadedImages.map(url =>
      `<img src="${url}" class="image-preview ${url === selectedAvatarFromGallery ? 'selected' : ''}" onclick="window.selectAvatarHandler('${url}')" alt="Preview" style="cursor: pointer; width: 120px; height: 120px; object-fit: cover; border-radius: 50%;">`
    ).join('');
    html += '</div></div>';
  }

  previewContainer.innerHTML = html;
};

// Handler wyboru awatara z galerii
const handleSelectAvatar = (url) => {
  selectedAvatarFromGallery = url;
  renderAvatarImagePreviews();
};

// Eksportuj handler i funkcję renderowania
if (typeof window !== 'undefined') {
  window.selectAvatarHandler = handleSelectAvatar;
}

export { renderAvatarImagePreviews };