// ===== ZARZĄDZANIE STANEM APLIKACJI =====

// Stan globalny
export const state = {
  currentUser: 'maks',
  isLoggedIn: false,
  categories: [],
  rewards: [],
  rewardFlowLock: false,
  pendingCategoryId: null,
  ADMIN_FLAG: 'adminLoggedIn',
  // Hash SHA-256 dla hasła: "admin123"
  // Aby zmienić hasło, użyj panelu admina lub wygeneruj nowy hash
  ADMIN_HASH: '1640c2fddf7f9dc5e1e06ae9df01879e4f6faf8b84a8ecf696f07cdcac000c66'
};

// Gettery
export const getCurrentUser = () => state.currentUser;
export const getIsLoggedIn = () => state.isLoggedIn;
export const getCategories = () => state.categories;
export const getRewards = () => state.rewards;
export const getRewardFlowLock = () => state.rewardFlowLock;
export const getPendingCategoryId = () => state.pendingCategoryId;

// Settery
export const setCurrentUser = (user) => {
  state.currentUser = user;
};

export const setIsLoggedIn = (value) => {
  state.isLoggedIn = value;
};

export const setCategories = (categories) => {
  state.categories = categories;
};

export const setRewards = (rewards) => {
  state.rewards = rewards;
};

export const setRewardFlowLock = (value) => {
  state.rewardFlowLock = value;
};

export const setPendingCategoryId = (id) => {
  state.pendingCategoryId = id;
};

// Funkcje pomocnicze
export const randInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const sha256 = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};