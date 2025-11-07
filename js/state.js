// ===== ZARZĄDZANIE STANEM APLIKACJI =====
import { clearImageCache } from './ui.js';
import { clearNoRewardsCache } from './rewards.js';

// Stan globalny
export const state = {
  currentUser: 'maks',
  isLoggedIn: false,
  categories: [],
  rewards: [],
  children: [],
  rewardFlowLock: false,
  pendingCategoryId: null,
  ADMIN_FLAG: 'adminLoggedIn',
  ADMIN_HASH: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  cache: {}
};

// Gettery
export const getCurrentUser = () => state.currentUser;
export const getIsLoggedIn = () => state.isLoggedIn;
export const getCategories = () => state.categories;
export const getRewards = () => state.rewards;
export const getChildren = () => state.children;
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
  if (state.cache[state.currentUser]) {
    state.cache[state.currentUser].categories = categories;
  }
};

export const setRewards = (rewards) => {
  state.rewards = rewards;
  if (state.cache[state.currentUser]) {
    state.cache[state.currentUser].rewards = rewards;
  }
};

export const setChildren = (children) => {
  state.children = children;
};

export const setRewardFlowLock = (value) => {
  state.rewardFlowLock = value;
};

export const setPendingCategoryId = (id) => {
  state.pendingCategoryId = id;
};

// Funkcje cache
export const getCachedData = (user) => {
  return state.cache[user] || { categories: null, rewards: null };
};

export const setCachedCategories = (user, categories) => {
  if (!state.cache[user]) {
    state.cache[user] = { categories: null, rewards: null };
  }
  state.cache[user].categories = categories;
};

export const setCachedRewards = (user, rewards) => {
  if (!state.cache[user]) {
    state.cache[user] = { categories: null, rewards: null };
  }
  state.cache[user].rewards = rewards;
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

export const generatePastelColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.random() * 20;
  const lightness = 75 + Math.random() * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const generateBorderColor = (backgroundColor) => {
  const match = backgroundColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return backgroundColor;
  
  const hue = parseInt(match[1]);
  const saturation = parseInt(match[2]);
  const lightness = Math.max(0, parseInt(match[3]) - 15);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const generateCategoryColors = () => {
  const bgColor = generatePastelColor();
  const borderColor = generateBorderColor(bgColor);
  return { color: bgColor, borderColor };
};

// Funkcja czyszcząca stan (przy wylogowaniu/zmianie użytkownika)
export const clearState = () => {
  console.log('🧹 Czyszczenie stanu aplikacji...');
  state.currentUser = null;
  state.categories = [];
  state.rewards = [];
  state.children = [];
  state.rewardFlowLock = false;
  state.pendingCategoryId = null;
  state.cache = {};

  // Wyczyść UI - usuń wszystkie karty z kontenera
  const container = document.getElementById('container');
  if (container) {
    container.innerHTML = '';
  }

  // Wyczyść przyciski użytkowników
  const userButtonsRow = document.querySelector('.user-buttons-row');
  if (userButtonsRow) {
    userButtonsRow.innerHTML = '';
  }

  // Usuń klasy tła dzieci
  document.body.classList.remove('maks-bg', 'nina-bg');
  document.body.style.backgroundColor = '';

  // Wyczyść wszystkie cache
  clearImageCache();
  clearNoRewardsCache();

  console.log('✅ Stan, UI i cache wyczyszczone');
};