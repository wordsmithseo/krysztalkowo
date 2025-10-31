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
  ADMIN_HASH: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  // Cache dla kategorii i nagród obu użytkowników
  cache: {
    maks: { categories: null, rewards: null },
    nina: { categories: null, rewards: null }
  }
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
  // Zaktualizuj cache dla aktualnego użytkownika
  if (state.cache[state.currentUser]) {
    state.cache[state.currentUser].categories = categories;
  }
};

export const setRewards = (rewards) => {
  state.rewards = rewards;
  // Zaktualizuj cache dla aktualnego użytkownika
  if (state.cache[state.currentUser]) {
    state.cache[state.currentUser].rewards = rewards;
  }
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

// Generowanie losowych pastelowych kolorów
export const generatePastelColor = () => {
  // Generuj odcień (hue) od 0 do 360
  const hue = Math.floor(Math.random() * 360);
  // Pastelowe kolory mają wysoką jasność (lightness) i niską saturację
  const saturation = 60 + Math.random() * 20; // 60-80%
  const lightness = 75 + Math.random() * 10; // 75-85%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Generuj ciemniejszy kolor do obramowania (o 15% ciemniejszy)
export const generateBorderColor = (backgroundColor) => {
  // Wyciągnij wartości HSL z koloru tła
  const match = backgroundColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return backgroundColor;
  
  const hue = parseInt(match[1]);
  const saturation = parseInt(match[2]);
  const lightness = Math.max(0, parseInt(match[3]) - 15); // Ciemniejszy o 15%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Generuj parę kolorów (tło i obramowanie)
export const generateCategoryColors = () => {
  const bgColor = generatePastelColor();
  const borderColor = generateBorderColor(bgColor);
  return { color: bgColor, borderColor };
};