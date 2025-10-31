// ===== PANEL ADMINISTRACYJNY =====
import { getCategories, getRewards, getChildren, setIsLoggedIn, state } from './state.js';
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
  deleteChild
} from './database.js';

const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const categoryList = document.getElementById('categoryList');
const rewardList = document.getElementById('rewardList');

let sortableInstance = null;

export const initializeSortable = () => {
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
};

export const renderAdminCategories = () => {
  const categories = getCategories();
  
  categoryList.innerHTML = categories.map(cat => `
    <li data-id="${cat.id}">
      <div class="left">
        <span class="drag-handle">☰</span>
        <span class="name">${cat.name}</span>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <div class="crystal-controls">
          <button onclick="window.modifyCrystalsHandler('${cat.id}', -1)" title="Odejmij kryształek">−</button>
          <span class="count">${cat.count || 0}</span>
          <button onclick="window.modifyCrystalsHandler('${cat.id}', 1)" title="Dodaj kryształek">+</button>
        </div>
        <div class="action-buttons">
          <button onclick="window.editCategoryHandler('${cat.id}')">✏️</button>
          <button onclick="window.deleteCategoryHandler('${cat.id}')">🗑️</button>
        </div>
      </div>
    </li>
  `).join('');
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
    let imageHtml = '';
    if (reward.image) {
      imageHtml = `<img src="${reward.image}" class="reward-img" alt="${reward.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23f0f0f0%22 rx=%225%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22%3E🎁%3C/text%3E%3C/svg%3E'; this.onerror=null;">`;
    } else {
      imageHtml = `<div style="width:40px;height:40px;background:#f0f0f0;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem;border:1px solid #ddd;">🎁</div>`;
    }
    
    return `
      <li>
        <div class="reward-left">
          ${imageHtml}
          <span class="reward-name">${reward.name}</span>
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
    <li>
      <div class="child-info">
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
  document.getElementById('editCategoryImage').value = cat.image || '';
  
  editModal.dataset.editingId = categoryId;
  
  renderImagePreviews(cat.image);
  
  adminModal.style.display = 'none';
  editModal.style.display = 'flex';
};

export const handleSaveEdit = async () => {
  const categoryId = editModal.dataset.editingId;
  
  const data = {
    name: document.getElementById('editCategoryName').value.trim(),
    goal: parseInt(document.getElementById('editCategoryGoal').value) || 10,
    image: document.getElementById('editCategoryImage').value.trim()
  };
  
  if (!data.name) {
    alert('Nazwa nie może być pusta!');
    return;
  }
  
  const success = await updateCategory(categoryId, data);
  
  if (success) {
    editModal.style.display = 'none';
    adminModal.style.display = 'flex';
    renderAdminCategories();
    initializeSortable();
  }
};

const renderImagePreviews = (currentImage) => {
  const previewContainer = document.getElementById('imagePreviewsEdit');
  
  const images = [
    'https://em-content.zobj.net/source/google/387/avocado_1f951.png',
    'https://em-content.zobj.net/source/google/387/artist-palette_1f3a8.png',
    'https://em-content.zobj.net/source/google/387/open-book_1f4d6.png',
    'https://em-content.zobj.net/source/google/387/red-apple_1f34e.png',
    'https://em-content.zobj.net/source/google/387/tangerine_1f34a.png',
    'https://em-content.zobj.net/source/google/387/strawberry_1f353.png',
    'https://em-content.zobj.net/source/google/387/broccoli_1f966.png',
    'https://em-content.zobj.net/source/google/387/carrot_1f955.png',
    'https://em-content.zobj.net/source/google/387/tomato_1f345.png',
    'https://em-content.zobj.net/source/google/387/person-running_1f3c3.png',
    'https://em-content.zobj.net/source/google/387/flexed-biceps_1f4aa.png',
    'https://em-content.zobj.net/source/google/387/water-wave_1f30a.png'
  ];
  
  previewContainer.innerHTML = images.map(url => 
    `<img src="${url}" class="image-preview" onclick="window.selectImageHandler('${url}')" alt="Preview">`
  ).join('');
};

export const handleSelectImage = (url) => {
  document.getElementById('editCategoryImage').value = url;
};

export const handleAddReward = async () => {
  const input = document.getElementById('rewardNameInput');
  const name = input.value.trim();
  
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

export const handleEditReward = async (rewardId) => {
  const rewards = getRewards();
  const reward = rewards.find(r => r.id === rewardId);
  
  if (!reward) return;
  
  const newName = prompt('Nowa nazwa nagrody:', reward.name);
  
  if (!newName || newName.trim() === '') return;
  
  const newImage = prompt('URL obrazka (opcjonalnie):', reward.image || '');
  
  const success = await updateReward(rewardId, {
    name: newName.trim(),
    image: newImage ? newImage.trim() : ''
  });
  
  if (success) {
    renderAdminRewards();
  }
};

export const handleResetRanking = async () => {
  showConfirmModal(
    '⚠️ Resetowanie rankingu',
    'Czy na pewno zresetować CAŁY ranking?\n\nSpowoduje to usunięcie wszystkich zwycięstw dla wszystkich dzieci we wszystkich kategoriach.\n\nTej operacji nie można cofnąć!',
    async () => {
      const success = await resetAllRankings();
      if (success) {
        alert('✅ Ranking został zresetowany!');
      } else {
        alert('❌ Błąd podczas resetowania rankingu!');
      }
    }
  );
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

export const handleSetAvatar = async (user) => {
  const input = document.getElementById('avatarUrlInput');
  const url = input.value.trim();
  
  if (!url) {
    alert('Podaj URL avatara!');
    return;
  }
  
  const success = await setAvatar(user, url);
  
  if (success) {
    input.value = '';
    alert(`Avatar dla ${user} został zaktualizowany!`);
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
  if (childId) {
    success = await updateChild(childId, { name, gender });
  } else {
    success = await addChild(name, gender);
  }
  
  if (success) {
    modal.style.display = 'none';
    renderChildrenList();
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
      const success = await deleteChild(childId);
      if (success) {
        renderChildrenList();
        // Odśwież listę przycisków użytkowników
        if (window.updateUserButtons) {
          window.updateUserButtons();
        }
      }
    }
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

if (typeof window !== 'undefined') {
  window.editCategoryHandler = handleEditCategory;
  window.deleteCategoryHandler = handleDeleteCategory;
  window.selectImageHandler = handleSelectImage;
  window.editRewardHandler = handleEditReward;
  window.deleteRewardHandler = handleDeleteReward;
  window.modifyCrystalsHandler = handleModifyCrystals;
  window.editChildHandler = openEditChildModal;
  window.deleteChildHandler = handleDeleteChild;
}