// ===== PANEL ADMINISTRACYJNY =====
import { getCategories, getRewards, setIsLoggedIn, state } from './state.js';
import { 
  addCategory, 
  deleteCategory, 
  updateCategory,
  updateCategoryOrder,
  addReward,
  deleteReward,
  updateReward,
  setAvatar
} from './database.js';

// Elementy DOM
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const categoryList = document.getElementById('categoryList');
const rewardList = document.getElementById('rewardList');

// Inicjalizacja Sortable dla kategorii
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
        const categories = getCategories();
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

// Renderowanie listy kategorii w adminie
export const renderAdminCategories = () => {
  const categories = getCategories();
  
  categoryList.innerHTML = categories.map(cat => `
    <li data-id="${cat.id}">
      <div class="left">
        <span class="drag-handle">☰</span>
        <span class="name">${cat.name}</span>
      </div>
      <div class="action-buttons">
        <button onclick="window.editCategoryHandler('${cat.id}')">✏️</button>
        <button onclick="window.deleteCategoryHandler('${cat.id}')">🗑️</button>
      </div>
    </li>
  `).join('');
};

// Renderowanie listy nagród w adminie
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

// Dodawanie kategorii
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

// Usuwanie kategorii
export const handleDeleteCategory = async (categoryId) => {
  const sure = confirm('Na pewno usunąć tę kategorię?');
  
  if (!sure) return;
  
  const success = await deleteCategory(categoryId);
  
  if (success) {
    renderAdminCategories();
    initializeSortable();
  }
};

// Edycja kategorii - otwarcie modala
export const handleEditCategory = (categoryId) => {
  const categories = getCategories();
  const cat = categories.find(c => c.id === categoryId);
  
  if (!cat) return;
  
  document.getElementById('editCategoryName').value = cat.name || '';
  document.getElementById('editCategoryGoal').value = cat.goal || 10;
  document.getElementById('editCategoryImage').value = cat.image || '';
  
  editModal.dataset.editingId = categoryId;
  
  // Podgląd obrazków
  renderImagePreviews(cat.image);
  
  adminModal.style.display = 'none';
  editModal.style.display = 'flex';
};

// Zapisywanie edycji kategorii
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

// Renderowanie podglądów obrazków
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

// Wybór obrazka z podglądu
export const handleSelectImage = (url) => {
  document.getElementById('editCategoryImage').value = url;
};

// Dodawanie nagrody
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

// Usuwanie nagrody
export const handleDeleteReward = async (rewardId) => {
  const sure = confirm('Na pewno usunąć tę nagrodę?');
  
  if (!sure) return;
  
  const success = await deleteReward(rewardId);
  
  if (success) {
    renderAdminRewards();
  }
};

// Edycja nagrody
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

// Ustawienie UI zalogowania
export const setLoggedInUi = (isLoggedIn) => {
  const adminBtn = document.getElementById('adminBtn');
  
  if (isLoggedIn) {
    adminBtn.classList.add('logged-in');
  } else {
    adminBtn.classList.remove('logged-in');
  }
  
  setIsLoggedIn(isLoggedIn);
};

// Ustawienie avatara
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

// Export funkcji globalnych dla onclick
if (typeof window !== 'undefined') {
  window.editCategoryHandler = handleEditCategory;
  window.deleteCategoryHandler = handleDeleteCategory;
  window.selectImageHandler = handleSelectImage;
  window.editRewardHandler = handleEditReward;
  window.deleteRewardHandler = handleDeleteReward;
}