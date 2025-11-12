/**
 * Moduł cache dla obrazów galerii
 * Przechowuje metadane obrazów w localStorage aby uniknąć wielokrotnego pobierania z Firebase
 */

const CACHE_KEY = 'krysztalkowo_image_cache';
const CACHE_VERSION_KEY = 'krysztalkowo_cache_version';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 godziny

/**
 * Pobiera cache z localStorage
 */
export const getImageCache = () => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;

    const cache = JSON.parse(cacheStr);

    // Sprawdź czy cache nie wygasł
    if (Date.now() - cache.timestamp > CACHE_DURATION) {
      console.log('Cache wygasł, czyszczenie...');
      clearImageCache();
      return null;
    }

    return cache;
  } catch (error) {
    console.error('Błąd odczytu cache:', error);
    clearImageCache();
    return null;
  }
};

/**
 * Zapisuje cache do localStorage
 */
export const setImageCache = (images, totalSize, count) => {
  try {
    const cache = {
      timestamp: Date.now(),
      images,
      totalSize,
      count
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`Cache zapisany: ${count} obrazków, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Błąd zapisu cache:', error);
    // Jeśli localStorage jest pełny, wyczyść cache
    if (error.name === 'QuotaExceededError') {
      clearImageCache();
    }
  }
};

/**
 * Czyści cache
 */
export const clearImageCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('Cache wyczyszczony');
  } catch (error) {
    console.error('Błąd czyszczenia cache:', error);
  }
};

/**
 * Inwaliduje cache (np. po dodaniu/usunięciu obrazka)
 */
export const invalidateImageCache = () => {
  clearImageCache();
  // Zwiększ wersję cache aby wymusić odświeżenie
  const version = parseInt(localStorage.getItem(CACHE_VERSION_KEY) || '0');
  localStorage.setItem(CACHE_VERSION_KEY, (version + 1).toString());
  console.log('Cache zinwalidowany');
};

/**
 * Pobiera wersję cache
 */
export const getCacheVersion = () => {
  return parseInt(localStorage.getItem(CACHE_VERSION_KEY) || '0');
};

/**
 * Sprawdza czy cache jest aktualny
 */
export const isCacheValid = () => {
  const cache = getImageCache();
  return cache !== null && cache.images && Array.isArray(cache.images);
};

/**
 * Pobiera statystyki cache
 */
export const getCacheStats = () => {
  const cache = getImageCache();
  if (!cache) {
    return {
      exists: false,
      age: 0,
      count: 0,
      size: 0
    };
  }

  return {
    exists: true,
    age: Date.now() - cache.timestamp,
    count: cache.count,
    size: cache.totalSize,
    ageFormatted: formatAge(Date.now() - cache.timestamp)
  };
};

/**
 * Formatuje wiek cache
 */
const formatAge = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};
